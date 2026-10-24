// ============================================================
// hotels-booking — идемпотентная бронь отеля (LiteAPI /rates/book)
// verify_jwt = false: checkout отеля анонимный.
// Безопасность: capability prebookId + transactionId.
// В БД — только SHA-256-хеши; response хранится для replay.
// При network/5xx — UNKNOWN и НИКАКИХ автоматических retry.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    status,
  });

const err = (code: string, message: string, status = 400) =>
  json({ error: { code, message } }, status);

const nowIso = () => new Date().toISOString();

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const isUniqueViolation = (error: any) =>
  error?.code === "23505" || /duplicate key/i.test(String(error?.message ?? ""));

const isAmbiguousStatus = (status: number) =>
  status >= 500 || status === 408;

async function callLiteApi(body: unknown) {
  const apiKey = Deno.env.get("LITE_API_KEY");
  if (!apiKey) throw new Error("LITE_API_KEY is not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${LITEAPI_BASE}/rates/book`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    return { status: res.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function upstreamMessage(data: any, fallback: string) {
  return (
    data?.error?.description ||
    data?.error?.message ||
    data?.message ||
    fallback
  );
}

async function updateAttempt(
  admin: any,
  id: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from("hotel_booking_attempts")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", id);

  if (error) {
    // Не логируем capability-токены. id безопасен для диагностики.
    console.error(
      JSON.stringify({
        fn: "hotels-booking",
        action: "book",
        attemptId: id,
        dbError: error.code ?? "DB_UPDATE_FAILED",
      }),
    );
    return false;
  }

  return true;
}

function replay(attempt: any) {
  const status = Number(attempt?.response_status) || 409;
  const headers: Record<string, string> =
    attempt?.status === "CONFIRMED"
      ? { "X-Idempotent-Replay": "true" }
      : {};

  if (attempt?.response) return json(attempt.response, status, headers);

  return json(
    {
      error: {
        code: attempt?.error_code ?? "BOOKING_FAILED",
        message: attempt?.error_message ?? "Booking failed",
      },
    },
    status,
    headers,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "Use POST", 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return err("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const prebookId =
    typeof body?.prebookId === "string" ? body.prebookId.trim() : "";
  const transactionId =
    typeof body?.payment?.transactionId === "string"
      ? body.payment.transactionId.trim()
      : "";
  const paymentMethod = body?.payment?.method ?? "TRANSACTION_ID";

  if (!prebookId || !transactionId) {
    return err("BAD_REQUEST", "Missing prebookId or transactionId", 400);
  }
  if (paymentMethod !== "TRANSACTION_ID") {
    return err("BAD_REQUEST", "Unsupported payment method", 400);
  }
  if (
    !body?.holder?.firstName ||
    !body?.holder?.lastName ||
    !body?.holder?.email
  ) {
    return err("BAD_REQUEST", "Missing holder details", 400);
  }
  if (!Array.isArray(body?.guests) || body.guests.length === 0) {
    return err("BAD_REQUEST", "Missing guests", 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return err("INTERNAL", "Server is not configured", 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const prebookHash = await sha256Hex(prebookId);
    const transactionHash = await sha256Hex(transactionId);

    const { data: inserted, error: insertError } = await admin
      .from("hotel_booking_attempts")
      .insert({
        prebook_hash: prebookHash,
        transaction_hash: transactionHash,
        status: "PROCESSING",
      })
      .select("*")
      .single();

    let attempt = inserted;

    if (insertError) {
      if (!isUniqueViolation(insertError)) {
        throw new Error(`DB insert failed: ${insertError.message}`);
      }

      const { data: existing, error: loadError } = await admin
        .from("hotel_booking_attempts")
        .select("*")
        .eq("prebook_hash", prebookHash)
        .eq("transaction_hash", transactionHash)
        .maybeSingle();

      if (loadError) throw new Error(`DB lookup failed: ${loadError.message}`);
      if (!existing) throw new Error("Booking attempt not found after conflict");

      if (existing.status === "CONFIRMED") return replay(existing);
      if (existing.status === "PROCESSING") {
        const age = Date.now() - Date.parse(existing.updated_at);
        if (Number.isFinite(age) && age > 2 * 60_000) {
          await updateAttempt(admin, existing.id, {
            status: "UNKNOWN",
            error_code: "BOOKING_UNKNOWN",
            error_message:
              "The booking outcome is unknown. Do not retry; contact support.",
          });
          return err(
            "BOOKING_UNKNOWN",
            "The booking outcome is unknown. Do not retry; contact support.",
            502,
          );
        }
        return err(
          "BOOKING_IN_PROGRESS",
          "This booking is already being processed.",
          409,
        );
      }
      if (existing.status === "UNKNOWN") {
        return err(
          "BOOKING_UNKNOWN",
          "The booking outcome is unknown. Do not retry; contact support.",
          502,
        );
      }

      return replay(existing);
    }

    if (!attempt?.id) throw new Error("Booking attempt was not created");

    const upstreamBody = {
      prebookId,
      holder: body.holder,
      payment: { method: "TRANSACTION_ID", transactionId },
      guests: body.guests,
    };

    let upstream: { status: number; data: any };
    try {
      upstream = await callLiteApi(upstreamBody);
    } catch (error: any) {
      const message =
        error?.name === "AbortError"
          ? "Booking request timed out"
          : "Booking request failed";

      await updateAttempt(admin, attempt.id, {
        status: "UNKNOWN",
        error_code: "BOOKING_UNKNOWN",
        error_message: message,
      });

      return err(
        "BOOKING_UNKNOWN",
        "The booking outcome is unknown. Do not retry; contact support.",
        502,
      );
    }

    const success =
      upstream.status >= 200 &&
      upstream.status < 300 &&
      !upstream.data?.error;

    if (success) {
      await updateAttempt(admin, attempt.id, {
        status: "CONFIRMED",
        response: upstream.data,
        response_status: upstream.status,
        error_code: null,
        error_message: null,
      });
      return json(upstream.data, upstream.status);
    }

    const ambiguous = isAmbiguousStatus(upstream.status);
    const message = upstreamMessage(
      upstream.data,
      `LiteAPI request failed (${upstream.status})`,
    );

    if (ambiguous) {
      await updateAttempt(admin, attempt.id, {
        status: "UNKNOWN",
        error_code: "BOOKING_UNKNOWN",
        error_message: message,
      });

      return err(
        "BOOKING_UNKNOWN",
        "The booking outcome is unknown. Do not retry; contact support.",
        502,
      );
    }

    await updateAttempt(admin, attempt.id, {
      status: "FAILED",
      response: upstream.data,
      response_status: upstream.status,
      error_code: upstream.data?.error?.code ?? "LITEAPI_ERROR",
      error_message: message,
    });

    return json(upstream.data, upstream.status);
  } catch (error: any) {
    // Без stack/body: в нём могут быть персональные данные и capability-токены.
    console.error(
      JSON.stringify({
        fn: "hotels-booking",
        action: "book",
        error: error?.message ?? "Unknown error",
      }),
    );
    return err("INTERNAL", "Could not process the booking", 500);
  }
});
