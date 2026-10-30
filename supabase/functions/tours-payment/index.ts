// ============================================================
// tours-payment — Phase 2 tour checkout payments (Stripe)
// actions: createIntent | status | sync
// verify_jwt = true — see supabase/config.toml
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_TIMEOUT_MS = 20_000;
const STRIPE_FEE_PERCENT = 0.039;
const STRIPE_FEE_FIXED_AED = 1;
const STRIPE_FEE_VAT = 0.05;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const err = (code: string, message: string, status = 400) =>
  json({ error: { code, message } }, status);

class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

const cleanString = (value: unknown, max = 255) =>
  String(value ?? "").trim().slice(0, max);

const toNumber = (value: unknown, fallback = Number.NaN) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

function calculatePaymentAmounts(serviceTotal: unknown) {
  const service = Math.max(0, toNumber(serviceTotal, 0));
  if (service <= 0) {
    return { serviceTotal: 0, paymentFee: 0, paymentTotal: 0, amount: 0 };
  }

  const gross = Math.ceil(
    ((service + STRIPE_FEE_FIXED_AED * (1 + STRIPE_FEE_VAT)) /
      (1 - STRIPE_FEE_PERCENT * (1 + STRIPE_FEE_VAT))) * 100,
  ) / 100;
  const serviceCents = Math.round(service * 100);
  const grossCents = Math.round(gross * 100);

  return {
    serviceTotal: roundMoney(service),
    paymentFee: roundMoney((grossCents - serviceCents) / 100),
    paymentTotal: roundMoney(gross),
    amount: grossCents,
  };
}

function sanitizePrebooking(row: any) {
  return {
    id: row.id,
    reference: row.client_reference_no,
    status: row.status,
    paymentStatus: row.payment_status,
    currency: row.currency,
    tourId: Number(row.tour_id),
    tourName: row.tour_name,
    tourCity: row.tour_city,
    tourImage: row.tour_image,
    optionId: Number(row.option_id),
    optionName: row.option_name,
    transferId: Number(row.transfer_id),
    transferType: row.transfer_type,
    transferName: row.transfer_name,
    tourDate: row.tour_date,
    timeSlotId: row.time_slot_id,
    startTime: row.start_time,
    adult: row.adult_count,
    child: row.child_count,
    infant: row.infant_count,
    pickup: row.pickup,
    adultRateB2c: Number(row.adult_rate_b2c),
    childRateB2c: Number(row.child_rate_b2c),
    total: Number(row.total_b2c),
    paymentFee: Number(row.payment_fee_b2c ?? 0),
    paymentTotal: Number(row.payment_total_b2c ?? row.total_b2c),
    client: row.client,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

function sanitizeAttempt(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
    paymentIntentId: row.stripe_payment_intent_id,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function stripeRequest(
  path: string,
  {
    method = "GET",
    body,
    idempotencyKey,
  }: {
    method?: string;
    body?: Record<string, string | number | undefined | null>;
    idempotencyKey?: string;
  } = {},
) {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new AppError(
      "CONFIG_ERROR",
      "Stripe is not configured. Please contact support.",
      500,
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
  };

  let payload: URLSearchParams | undefined;
  if (body) {
    payload = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue;
      payload.append(key, String(value));
    }
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STRIPE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${STRIPE_API}${path}`, {
      method,
      headers,
      body: payload,
      signal: controller.signal,
    });
  } catch (error: any) {
    console.error("Stripe request failed:", error?.message ?? error);
    throw new AppError(
      "STRIPE_UNAVAILABLE",
      "Payment service is temporarily unavailable. Please try again.",
      502,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    console.error(
      JSON.stringify({
        fn: "tours-payment",
        stripePath: path,
        status: response.status,
        code: data?.error?.code,
        message: data?.error?.message,
      }),
    );
    throw new AppError(
      "STRIPE_ERROR",
      data?.error?.message || "Stripe request failed. Please try again.",
      502,
    );
  }

  return data;
}

async function loadPrebooking(admin: any, prebookingId: string, userId: string) {
  const { data, error } = await admin
    .from("tours_pre_bookings")
    .select(
      "id, user_id, status, payment_status, currency, client_reference_no, tour_id, tour_name, tour_city, tour_image, option_id, option_name, transfer_id, transfer_type, transfer_name, tour_date, time_slot_id, start_time, adult_count, child_count, infant_count, pickup, adult_rate_b2c, child_rate_b2c, total_b2c, payment_fee_b2c, payment_total_b2c, client, created_at, paid_at, stripe_payment_intent_id, stripe_client_secret",
    )
    .eq("id", prebookingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("tours_pre_bookings load failed:", error.message);
    throw new AppError("READ_ERROR", "Could not load your pre-booking.", 500);
  }

  return data ?? null;
}

async function latestAttempt(admin: any, prebookingId: string) {
  const { data, error } = await admin
    .from("tours_payment_attempts")
    .select(
      "id, status, amount, currency, stripe_payment_intent_id, stripe_client_secret, error_code, error_message, created_at, updated_at",
    )
    .eq("prebooking_id", prebookingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("tours_payment_attempts load failed:", error.message);
    throw new AppError("READ_ERROR", "Could not load payment attempt.", 500);
  }

  return Array.isArray(data) && data.length ? data[0] : null;
}

async function updateAttempt(admin: any, attemptId: string, patch: Record<string, unknown>) {
  const { error } = await admin
    .from("tours_payment_attempts")
    .update(patch)
    .eq("id", attemptId);

  if (error) {
    console.error("tours_payment_attempts update failed:", error.message);
  }
}

async function updatePrebookingPayment(
  admin: any,
  prebookingId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from("tours_pre_bookings")
    .update(patch)
    .eq("id", prebookingId);

  if (error) {
    console.error("tours_pre_bookings payment update failed:", error.message);
  }
}

function statusPatch(paymentIntent: any) {
  const status = cleanString(paymentIntent?.status, 40);
  if (status === "succeeded") {
    return { payment_status: "paid" as const };
  }
  if (status === "processing") {
    return { payment_status: "processing" as const };
  }
  if (status === "requires_action" || status === "requires_confirmation") {
    return { payment_status: "processing" as const };
  }
  if (status === "canceled") {
    return { payment_status: "failed" as const };
  }
  if (status === "requires_payment_method" && paymentIntent?.last_payment_error) {
    return { payment_status: "failed" as const };
  }
  return {};
}

async function finalizeIntent(
  admin: any,
  prebooking: any,
  attempt: any,
  paymentIntent: any,
) {
  const amount = Math.trunc(
    toNumber(paymentIntent?.amount_received, toNumber(paymentIntent?.amount, 0)),
  );
  const currency = cleanString(paymentIntent?.currency, 8).toUpperCase();

  const { data: bookingId, error } = await admin.rpc("finalize_tour_payment", {
    p_prebooking_id: prebooking.id,
    p_payment_intent_id: paymentIntent.id,
    p_amount: amount,
    p_currency: currency,
  });

  if (error) {
    console.error(
      JSON.stringify({
        fn: "tours-payment",
        action: "finalize",
        prebookingId: prebooking.id,
        paymentIntentId: paymentIntent.id,
        error: error.message,
      }),
    );

    if (/AMOUNT_MISMATCH|CURRENCY_MISMATCH/.test(error.message)) {
      await updateAttempt(admin, attempt.id, {
        status: "failed",
        error_code: "PAYMENT_MISMATCH",
        error_message: "Stripe amount or currency does not match the pre-booking.",
      });
      await updatePrebookingPayment(admin, prebooking.id, {
        payment_status: "failed",
        admin_note: "Stripe amount/currency mismatch — manual review required.",
      });
      throw new AppError(
        "PAYMENT_MISMATCH",
        "Payment amount does not match the booking. Please contact support.",
        409,
      );
    }

    throw new AppError(
      "FINALIZE_ERROR",
      "Payment was received but the booking could not be finalized. Please contact support.",
      500,
    );
  }

  await updateAttempt(admin, attempt.id, {
    status: "succeeded",
    stripe_payment_intent_id: paymentIntent.id,
    stripe_client_secret: paymentIntent.client_secret ?? attempt.stripe_client_secret,
    error_code: null,
    error_message: null,
  });

  await updatePrebookingPayment(admin, prebooking.id, {
    stripe_payment_intent_id: paymentIntent.id,
    stripe_client_secret: paymentIntent.client_secret ?? prebooking.stripe_client_secret,
  });

  return bookingId ?? null;
}

async function syncIntent(admin: any, prebooking: any, attempt: any, paymentIntent: any) {
  if (paymentIntent?.status === "succeeded") {
    await finalizeIntent(admin, prebooking, attempt, paymentIntent);
    return;
  }

  const patch = statusPatch(paymentIntent);
  await updateAttempt(admin, attempt.id, {
    status: cleanString(paymentIntent?.status, 40) || "processing",
    stripe_payment_intent_id: paymentIntent.id,
    stripe_client_secret: paymentIntent.client_secret ?? attempt.stripe_client_secret,
    error_code: paymentIntent?.last_payment_error?.code ?? null,
    error_message: paymentIntent?.last_payment_error?.message ?? null,
  });

  if (Object.keys(patch).length) {
    await updatePrebookingPayment(admin, prebooking.id, patch);
  }
}

async function handleCreateIntent(admin: any, user: any, body: any) {
  const prebookingId = cleanString(body?.prebookingId, 64);
  if (!prebookingId) {
    throw new AppError("INVALID_INPUT", "prebookingId is required.", 400);
  }

  let prebooking = await loadPrebooking(admin, prebookingId, user.id);
  if (!prebooking) {
    throw new AppError("NOT_FOUND", "Pre-booking not found.", 404);
  }

  if (
    prebooking.payment_status === "paid" ||
    prebooking.status === "paid" ||
    prebooking.status === "confirmed"
  ) {
    return json({
      paid: true,
      prebooking: sanitizePrebooking(prebooking),
      attempt: sanitizeAttempt(await latestAttempt(admin, prebookingId)),
    });
  }

  if (
    prebooking.payment_status === "refunded" ||
    prebooking.status === "cancelled" ||
    prebooking.status === "expired"
  ) {
    throw new AppError(
      "INVALID_STATE",
      "This pre-booking can no longer be paid.",
      409,
    );
  }

  const amounts = calculatePaymentAmounts(prebooking.total_b2c);
  const amount = amounts.amount;
  if (amount <= 0) {
    throw new AppError("PRICE_ERROR", "This pre-booking has an invalid total.", 409);
  }

  const { data: attemptData, error: attemptError } = await admin.rpc(
    "begin_tour_payment_attempt",
    {
      p_prebooking_id: prebookingId,
      p_user_id: user.id,
      p_amount: amount,
    },
  );

  if (attemptError) {
    const message = attemptError.message ?? "";
    if (/PREBOOKING_NOT_FOUND/.test(message)) {
      throw new AppError("NOT_FOUND", "Pre-booking not found.", 404);
    }
    if (/FORBIDDEN/.test(message)) {
      throw new AppError("FORBIDDEN", "This pre-booking belongs to another user.", 403);
    }
    if (/INVALID_STATE/.test(message)) {
      throw new AppError(
        "INVALID_STATE",
        "This pre-booking can no longer be paid.",
        409,
      );
    }
    if (/AMOUNT_MISMATCH/.test(message)) {
      throw new AppError(
        "AMOUNT_MISMATCH",
        "Pre-booking total changed. Please start checkout again.",
        409,
      );
    }
    console.error("begin_tour_payment_attempt failed:", message);
    throw new AppError("PAYMENT_ERROR", "Could not start payment.", 500);
  }

  let attempt = Array.isArray(attemptData) ? attemptData[0] : attemptData;
  if (!attempt?.id) {
    throw new AppError("PAYMENT_ERROR", "Could not start payment.", 500);
  }

  prebooking = await loadPrebooking(admin, prebookingId, user.id);
  if (!prebooking) {
    throw new AppError("NOT_FOUND", "Pre-booking not found.", 404);
  }

  let paymentIntent: any = null;

  if (attempt.stripe_payment_intent_id) {
    paymentIntent = await stripeRequest(
      `/payment_intents/${encodeURIComponent(attempt.stripe_payment_intent_id)}`,
    );

    if (paymentIntent?.status === "canceled") {
      await updateAttempt(admin, attempt.id, {
        status: "canceled",
        error_code: "CANCELED",
        error_message: "PaymentIntent was canceled.",
      });
      await updatePrebookingPayment(admin, prebookingId, {
        payment_status: "failed",
      });

      const { data: newAttemptData, error: newAttemptError } = await admin.rpc(
        "begin_tour_payment_attempt",
        {
          p_prebooking_id: prebookingId,
          p_user_id: user.id,
          p_amount: amount,
        },
      );
      if (newAttemptError) {
        console.error("begin_tour_payment_attempt retry failed:", newAttemptError.message);
        throw new AppError("PAYMENT_ERROR", "Could not start payment.", 500);
      }
      attempt = Array.isArray(newAttemptData) ? newAttemptData[0] : newAttemptData;
      if (!attempt?.id) {
        throw new AppError("PAYMENT_ERROR", "Could not start payment.", 500);
      }
      paymentIntent = null;
    } else if (paymentIntent?.status === "succeeded") {
      await finalizeIntent(admin, prebooking, attempt, paymentIntent);
      prebooking = await loadPrebooking(admin, prebookingId, user.id);
      return json({
        paid: true,
        prebooking: sanitizePrebooking(prebooking),
        attempt: sanitizeAttempt(await latestAttempt(admin, prebookingId)),
      });
    } else {
      await updateAttempt(admin, attempt.id, {
        status: cleanString(paymentIntent?.status, 40) || attempt.status,
        stripe_client_secret: paymentIntent?.client_secret ?? attempt.stripe_client_secret,
        error_code: paymentIntent?.last_payment_error?.code ?? null,
        error_message: paymentIntent?.last_payment_error?.message ?? null,
      });
      await updatePrebookingPayment(admin, prebookingId, {
        stripe_payment_intent_id: paymentIntent.id,
        stripe_client_secret: paymentIntent?.client_secret ?? null,
        ...statusPatch(paymentIntent),
      });
    }
  }

  if (!paymentIntent) {
    paymentIntent = await stripeRequest("/payment_intents", {
      method: "POST",
      idempotencyKey: attempt.id,
      body: {
        amount,
        currency: "aed",
        "payment_method_types[0]": "card",
        capture_method: "automatic",
        description: cleanString(
          `Tour ${prebooking.client_reference_no} · ${prebooking.tour_name ?? "Booking"}`,
          1000,
        ),
        "metadata[prebooking_id]": prebooking.id,
        "metadata[user_id]": user.id,
        "metadata[reference]": cleanString(prebooking.client_reference_no, 200),
        "metadata[tour_id]": cleanString(prebooking.tour_id, 100),
        "metadata[option_id]": cleanString(prebooking.option_id, 100),
        "metadata[service_total]": String(amounts.serviceTotal),
        "metadata[payment_fee]": String(amounts.paymentFee),
        "metadata[payment_total]": String(amounts.paymentTotal),
      },
    });
  }

  if (!paymentIntent?.id || !paymentIntent?.client_secret) {
    throw new AppError(
      "PAYMENT_ERROR",
      "Stripe did not return a payment session. Please try again.",
      502,
    );
  }

  await updateAttempt(admin, attempt.id, {
    status: cleanString(paymentIntent.status, 40) || "requires_payment_method",
    stripe_payment_intent_id: paymentIntent.id,
    stripe_client_secret: paymentIntent.client_secret,
    error_code: paymentIntent?.last_payment_error?.code ?? null,
    error_message: paymentIntent?.last_payment_error?.message ?? null,
  });

  await updatePrebookingPayment(admin, prebookingId, {
    stripe_payment_intent_id: paymentIntent.id,
    stripe_client_secret: paymentIntent.client_secret,
    ...statusPatch(paymentIntent),
  });

  prebooking = await loadPrebooking(admin, prebookingId, user.id);
  const freshAttempt = await latestAttempt(admin, prebookingId);

  return json({
    paid: false,
    prebooking: sanitizePrebooking(prebooking),
    attempt: sanitizeAttempt(freshAttempt),
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    amounts: {
      serviceTotal: Number(prebooking.total_b2c),
      paymentFee: Number(prebooking.payment_fee_b2c ?? 0),
      paymentTotal: Number(prebooking.payment_total_b2c ?? prebooking.total_b2c),
    },
  });
}

async function handleStatus(admin: any, user: any, body: any) {
  const prebookingId = cleanString(body?.prebookingId, 64);
  if (!prebookingId) {
    throw new AppError("INVALID_INPUT", "prebookingId is required.", 400);
  }

  const prebooking = await loadPrebooking(admin, prebookingId, user.id);
  if (!prebooking) {
    throw new AppError("NOT_FOUND", "Pre-booking not found.", 404);
  }

  return json({
    prebooking: sanitizePrebooking(prebooking),
    attempt: sanitizeAttempt(await latestAttempt(admin, prebookingId)),
  });
}

async function handleSync(admin: any, user: any, body: any) {
  const prebookingId = cleanString(body?.prebookingId, 64);
  if (!prebookingId) {
    throw new AppError("INVALID_INPUT", "prebookingId is required.", 400);
  }

  let prebooking = await loadPrebooking(admin, prebookingId, user.id);
  if (!prebooking) {
    throw new AppError("NOT_FOUND", "Pre-booking not found.", 404);
  }

  if (
    prebooking.payment_status === "paid" ||
    prebooking.payment_status === "refunded" ||
    prebooking.status === "confirmed" ||
    prebooking.status === "cancelled" ||
    prebooking.status === "expired"
  ) {
    return json({
      prebooking: sanitizePrebooking(prebooking),
      attempt: sanitizeAttempt(await latestAttempt(admin, prebookingId)),
    });
  }

  const attempt = await latestAttempt(admin, prebookingId);
  if (!attempt?.stripe_payment_intent_id) {
    return json({
      prebooking: sanitizePrebooking(prebooking),
      attempt: sanitizeAttempt(attempt),
    });
  }

  const paymentIntent = await stripeRequest(
    `/payment_intents/${encodeURIComponent(attempt.stripe_payment_intent_id)}`,
  );

  await syncIntent(admin, prebooking, attempt, paymentIntent);

  prebooking = await loadPrebooking(admin, prebookingId, user.id);

  return json({
    prebooking: sanitizePrebooking(prebooking),
    attempt: sanitizeAttempt(await latestAttempt(admin, prebookingId)),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "Use POST.", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new AppError("CONFIG_ERROR", "Server is not configured.", 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      throw new AppError("UNAUTHORIZED", "Please sign in again.", 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      throw new AppError("UNAUTHORIZED", "Please sign in again.", 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new AppError("INVALID_INPUT", "Request body is required.", 400);
    }

    const action = cleanString(body.action, 32).toLowerCase();
    if (action === "createintent") {
      return await handleCreateIntent(admin, userData.user, body);
    }
    if (action === "status") {
      return await handleStatus(admin, userData.user, body);
    }
    if (action === "sync") {
      return await handleSync(admin, userData.user, body);
    }

    throw new AppError("INVALID_ACTION", "Unsupported action.", 400);
  } catch (error: any) {
    if (error instanceof AppError) {
      return err(error.code, error.message, error.status);
    }

    console.error("tours-payment unexpected error:", error);
    return err("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
  }
});
