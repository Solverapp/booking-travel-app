// ============================================================
// flights-booking — состояние бронирования перелёта (LiteAPI Flights)
// actions: verify | prebook | book | get
// Секреты (offerId, prebookId, transactionId) живут только здесь.
// Клиент получает sessionId (+ secretKey для Payment SDK на шаге оплаты).
// verify_jwt = true — см. supabase/config.toml
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now();
const iso = (d: Date) => d.toISOString();
const minutesFromNow = (m: number) => iso(new Date(now() + m * 60_000));

const asArray = (v: any): any[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

// --- Возрастные правила пассажиров (IATA): 0 = adult, 1 = child, 2 = infant ---
const AGE_RULES = [
  { min: 12, max: Number.POSITIVE_INFINITY },
  { min: 2, max: 11 },
  { min: 0, max: 1 },
];

function parseDay(value: any): Date | null {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageOn(birthday: any, on: Date): number | null {
  const born = parseDay(birthday);
  if (!born) return null;
  let age = on.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - born.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < born.getUTCDate())) age -= 1;
  return age;
}

// --- LiteAPI ---
async function liteapi(path: string, method = "GET", body?: unknown) {
  const apiKey = Deno.env.get("LITE_API_KEY");
  if (!apiKey) throw new Error("LITE_API_KEY is not configured");

  const res = await fetch(`${LITEAPI_BASE}${path}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "X-API-Key": apiKey,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

// Проброс ошибки LiteAPI в едином конверте { error: { code, message } }
function passthrough(status: number, data: any) {
  const upstream = data?.error;
  const message =
    upstream?.description || upstream?.message || `LiteAPI request failed (${status})`;
  return json({ error: { code: upstream?.code ?? "LITEAPI_ERROR", message } }, status);
}

// Оффер распродан (LiteAPI 52010) — стабильный код для клиента
const SOLD_OUT_MESSAGE = "This flight just sold out — please pick another offer from the results.";
function isSoldOut(data: any): boolean {
  const code = Number(data?.error?.code);
  const message = String(data?.error?.description ?? data?.error?.message ?? "");
  return code === 52010 || /sold out/i.test(message);
}

// Срок жизни сессии: не позже 15 минут; если офер истекает раньше — берём его срок
function pickExpiry(journey: any): string {
  const maxTs = now() + 15 * 60_000;
  const exp = journey?.expiration ? Date.parse(journey.expiration) : NaN;
  if (!Number.isNaN(exp) && exp < maxTs) return iso(new Date(exp));
  return iso(new Date(maxTs));
}

function slimSegments(segments: any[]) {
  return asArray(segments).map((s) => ({
    direction: s?.direction ?? null,
    originCode: s?.originCode ?? null,
    destinationCode: s?.destinationCode ?? null,
    departureTime: s?.departureTime ?? null,
    arrivalTime: s?.arrivalTime ?? null,
    flightNumber: s?.flight?.marketingNumber ?? null,
    carrier: s?.carrier?.marketingCode ?? null,
  }));
}

// Ответ /flights/bookings → сводка для БД и клиента (устойчиво к вариациям схемы)
function buildBookingSummary(payload: any, session: any) {
  const root = payload?.data?.[0] ?? payload?.data ?? {};
  const booking = root?.booking ?? root;
  const segments = asArray(booking?.journey?.segments);
  const outbound = segments.filter((s: any) => s?.direction !== "INBOUND");
  const firstLeg = outbound.length ? outbound : segments;
  const first = firstLeg[0] ?? {};
  const last = firstLeg[firstLeg.length - 1] ?? {};

  const airlineBookings = asArray(
    booking?.order?.reference?.airlineBookings ?? booking?.airlineBookings
  );
  const pnr = airlineBookings[0]?.airlinePnr ?? root?.airlinePnr ?? booking?.bookingRef ?? null;

  const carrier = first?.carrier?.marketingName ?? first?.carrier?.marketingCode ?? "Flight";
  const origin = first?.originCode ?? session?.search_params?.legs?.[0]?.origin ?? "?";
  const destination = last?.destinationCode ?? session?.search_params?.legs?.[0]?.destination ?? "?";

  const total =
    Number(
      booking?.pricing?.totalAmount ??
        booking?.price?.total ??
        root?.totalAmount ??
        root?.total ??
        session?.verified_price ??
        0
    ) || 0;
  const currency =
    booking?.pricing?.currency ??
    booking?.order?.currency ??
    root?.currency ??
    session?.currency ??
    "AED";

  return {
    bookingId: booking?.bookingId ?? root?.bookingId ?? null,
    bookingRef: booking?.bookingRef ?? root?.bookingRef ?? null,
    pnr,
    status: booking?.status ?? root?.status ?? null,
    tourName: `${origin} → ${destination} · ${carrier}`,
    total,
    currency,
    meta: {
      bookingId: booking?.bookingId ?? root?.bookingId ?? null,
      bookingRef: booking?.bookingRef ?? root?.bookingRef ?? null,
      pnr,
      orderRef: session?.order_ref ?? null,
      origin,
      destination,
      passengers: asArray(booking?.passengers).length || asArray(session?.passengers).length || 1,
      segments: slimSegments(segments),
    },
  };
}

async function loadSession(admin: any, user: any, sessionId: string) {
  if (!sessionId) return { error: err("BAD_REQUEST", "sessionId is required") };

  const { data: session, error } = await admin
    .from("flight_booking_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw new Error(`DB session load failed: ${error.message}`);
  if (!session) return { error: err("SESSION_NOT_FOUND", "Session not found", 404) };
  if (session.user_id !== user.id)
    return { error: err("FORBIDDEN", "Session belongs to another user", 403) };

  return { session };
}

// --- Actions ---
async function handleVerify(admin: any, user: any, body: any) {
  const offerId = body?.offerId;
  if (!offerId) return err("BAD_REQUEST", "offerId is required");

  const { status, data } = await liteapi("/flights/verify", "POST", { offerId });

  if (status === 404)
    return err("OFFER_EXPIRED", data?.error?.description ?? "Offer is no longer available", 404);
  if (status !== 200 || !data?.data?.[0]?.journey) {
    if (isSoldOut(data)) return err("OFFER_SOLD_OUT", SOLD_OUT_MESSAGE, 409);
    if (status >= 500)
      console.error(JSON.stringify({ fn: "flights-booking", action: "verify", offerId, upstreamStatus: status }));
    return passthrough(status, data);
  }

  const verified = data.data[0];
  const journey = verified.journey;
  const price = journey?.pricing?.display?.total ?? null;
  const currency = journey?.pricing?.display?.currency ?? "AED";

  const { data: session, error } = await admin
    .from("flight_booking_sessions")
    .insert({
      user_id: user.id,
      status: "VERIFIED",
      offer_id: offerId,
      verified_price: price,
      currency,
      search_params: body?.searchParams ?? null,
      journey: verified, // { journey, changes } — refresh-safe для /flightpage/:sessionId
      expires_at: pickExpiry(journey),
      updated_at: iso(new Date()),
    })
    .select("id, order_ref")
    .single();

  if (error) throw new Error(`DB session insert failed: ${error.message}`);

  return json({
    sessionId: session.id,
    orderRef: session.order_ref,
    journey,
    changes: verified.changes ?? null,
  });
}

async function handlePrebook(admin: any, user: any, body: any) {
  const loaded = await loadSession(admin, user, body?.sessionId);
  if (loaded.error) return loaded.error;
  const session = loaded.session as any;

  // Повторный вызов — не создаём второй prebook
  if (session.status === "PREBOOKED" && session.secret_key) {
    return json({ prebookId: session.prebook_id, secretKey: session.secret_key, reused: true });
  }
  if (session.status !== "VERIFIED")
    return err("INVALID_STATE", `Cannot prebook session in status ${session.status}`, 409);

  const contact = body?.contact;
  const passengers = asArray(body?.passengers);
  if (!contact || passengers.length === 0)
    return err("BAD_REQUEST", "contact and passengers are required");

  // Мультипассажиры: состав и типы должны совпадать с поиском
  // (LiteAPI: passengers length must match adults+children+infants)
  const searchCounts = {
    adults: Math.max(1, Number(session.search_params?.adults) || 1),
    children: Math.max(0, Number(session.search_params?.children) || 0),
    infants: Math.max(0, Number(session.search_params?.infants) || 0),
  };
  const expectedTotal = searchCounts.adults + searchCounts.children + searchCounts.infants;
  if (passengers.length !== expectedTotal)
    return err(
      "BAD_REQUEST",
      `passengers must match the search: expected ${expectedTotal} (${searchCounts.adults} adults, ${searchCounts.children} children, ${searchCounts.infants} infants), got ${passengers.length}`,
    );

  const expectedTypeAt = (index: number) =>
    index < searchCounts.adults
      ? 0
      : index < searchCounts.adults + searchCounts.children
        ? 1
        : 2;

  for (let index = 0; index < passengers.length; index += 1) {
    const sent = passengers[index]?.passengerType;
    if (sent !== undefined && sent !== null && Number(sent) !== expectedTypeAt(index))
      return err(
        "BAD_REQUEST",
        `passenger ${index + 1} passengerType does not match the search (${searchCounts.adults} adults, ${searchCounts.children} children, ${searchCounts.infants} infants)`,
      );
  }

  const normalizedPassengers = passengers.map((passenger: any, index: number) => ({
    ...passenger,
    passengerType: expectedTypeAt(index),
  }));

  // Возраст на дату вылета и срок действия паспорта (дата из поиска сессии)
  const travelDay = parseDay(session.search_params?.legs?.[0]?.date);
  if (travelDay) {
    for (let index = 0; index < normalizedPassengers.length; index += 1) {
      const rule = AGE_RULES[expectedTypeAt(index)];
      const age = ageOn(normalizedPassengers[index]?.birthday, travelDay);
      if (age === null)
        return err("BAD_REQUEST", `passenger ${index + 1} has an invalid date of birth`);
      if (age < rule.min || age > rule.max)
        return err(
          "BAD_REQUEST",
          `passenger ${index + 1} date of birth does not match the passenger type (age ${age} at departure)`,
        );
      const expiry = parseDay(normalizedPassengers[index]?.documentExpiry);
      if (expiry && expiry.getTime() < travelDay.getTime())
        return err(
          "BAD_REQUEST",
          `passenger ${index + 1} passport expires before the departure date`,
        );
    }
  }

  // Авто-re-verify, если сессия протухла
  let verifiedPrice = session.verified_price;
  const expired = session.expires_at ? Date.parse(session.expires_at) < now() : false;
  if (expired) {
    const v = await liteapi("/flights/verify", "POST", { offerId: session.offer_id });
    if (v.status === 404)
      return err("OFFER_EXPIRED", v.data?.error?.description ?? "Offer is no longer available", 404);
    if (isSoldOut(v.data)) return err("OFFER_SOLD_OUT", SOLD_OUT_MESSAGE, 409);
    if (v.status !== 200 || !v.data?.data?.[0]?.journey) return passthrough(v.status, v.data);

    const reverified = v.data.data[0];
    verifiedPrice = reverified?.journey?.pricing?.display?.total ?? verifiedPrice;
    await admin
      .from("flight_booking_sessions")
      .update({
        journey: reverified,
        verified_price: verifiedPrice,
        expires_at: pickExpiry(reverified?.journey),
        updated_at: iso(new Date()),
      })
      .eq("id", session.id);
  }

  const { status, data } = await liteapi("/flights/prebooks", "POST", {
    offerId: session.offer_id,
    usePaymentSdk: true,
    contact,
    passengers: normalizedPassengers,
  });

  if (status !== 200) {
    if (isSoldOut(data)) return err("OFFER_SOLD_OUT", SOLD_OUT_MESSAGE, 409);
    if (status >= 500)
      console.error(JSON.stringify({ fn: "flights-booking", action: "prebook", sessionId: session.id, upstreamStatus: status }));
    return passthrough(status, data);
  }

  const root = data?.data?.[0] ?? data?.data ?? {};
  const prebookId = root?.prebookId ?? root?.booking?.prebookId ?? root?.id ?? null;
  const transactionId = root?.payment?.transactionId ?? root?.transactionId ?? null;
  const secretKey = root?.payment?.secretKey ?? root?.secretKey ?? null;

  if (!prebookId) {
    console.error(JSON.stringify({
      fn: "flights-booking", action: "prebook", sessionId: session.id,
      keys: Object.keys(root), raw: JSON.stringify(data).slice(0, 2000),
    }));
    return err("PREBOOK_NO_ID", "LiteAPI did not return prebookId", 502);
  }

  const { error: updErr } = await admin
    .from("flight_booking_sessions")
    .update({
      status: "PREBOOKED",
      prebook_id: prebookId,
      transaction_id: transactionId,
      secret_key: secretKey,
      contact,
      passengers: normalizedPassengers,
      expires_at: minutesFromNow(15),
      updated_at: iso(new Date()),
    })
    .eq("id", session.id);

  if (updErr) throw new Error(`DB session update failed: ${updErr.message}`);

  return json({ prebookId, secretKey });
}

async function handleBook(admin: any, user: any, body: any) {
  const loaded = await loadSession(admin, user, body?.sessionId);
  if (loaded.error) return loaded.error;
  const session = loaded.session as any;

  // Идемпотентность: уже забронировано — возвращаем существующее
  const { data: existing } = await admin
    .from("flight_bookings")
    .select("*")
    .eq("session_id", session.id)
    .maybeSingle();

  if (existing) {
    return json({
      bookingId: existing.booking_id,
      bookingRef: existing.booking_ref,
      pnr: existing.provider_payload?.pnr ?? null,
      status: existing.status,
      reused: true,
    });
  }

  if (session.status !== "PREBOOKED" || !session.prebook_id)
    return err("INVALID_STATE", "Prebook must be created first", 409);
  if (!session.transaction_id)
    return err("NO_TRANSACTION", "transactionId is missing in session", 409);

  // Атомарный захват: только один параллельный вызов уйдёт в LiteAPI
  const { data: claimed } = await admin
    .from("flight_booking_sessions")
    .update({ status: "BOOKING", updated_at: iso(new Date()) })
    .eq("id", session.id)
    .eq("status", "PREBOOKED")
    .select("id");

  if (!claimed?.length)
    return err("BOOKING_IN_PROGRESS", "Booking is already in progress", 409);

  let lastStatus = 0;
  let lastData: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await liteapi("/flights/bookings", "POST", {
        prebookId: session.prebook_id,
        payment: { method: "TRANSACTION_ID", transactionId: session.transaction_id },
        customTags: { ORDER_REF: session.order_ref },
      });
      lastStatus = res.status;
      lastData = res.data;

      // 201 Created (и любой 2xx) — бронь создана
      if (res.status >= 200 && res.status < 300) {
        const summary = buildBookingSummary(res.data, session);
        const bookingId = summary.bookingId ?? `prebook:${session.prebook_id}`;

        const { error: fbErr } = await admin.from("flight_bookings").upsert(
          {
            session_id: session.id,
            user_id: user.id,
            booking_id: bookingId,
            booking_ref: summary.bookingRef,
            status: summary.status,
            total_amount: summary.total,
            currency: summary.currency,
            provider_payload: { ...lastData, pnr: summary.pnr },
          },
          { onConflict: "booking_id" }
        );
        if (fbErr) throw new Error(`DB flight_bookings upsert failed: ${fbErr.message}`);

        const { error: bErr } = await admin.from("bookings").insert({
          user_id: user.id,
          name: summary.tourName,
          sum: summary.total,
          Service: "Flight",
          status: "Confirmed",
          reference: summary.pnr ?? summary.bookingRef,
          order_ref: session.order_ref,
          meta: summary.meta,
          currency: summary.currency,
        });
        if (bErr)
          console.error(JSON.stringify({ fn: "flights-booking", action: "book", sessionId: session.id, dbError: bErr.message }));

        await admin
          .from("flight_booking_sessions")
          .update({ status: "CONFIRMED", updated_at: iso(new Date()) })
          .eq("id", session.id);

        return json(summary);
      }

      // 409 — prebook не позволяет бронь: не ретраим
      if (res.status === 409) break;

      // Ретрай только на 5xx
      if (res.status >= 500 && attempt < 3) {
        await sleep(1000 * attempt);
        continue;
      }
      break;
    } catch (e: any) {
      if (attempt < 3) {
        await sleep(1000 * attempt);
        continue;
      }
      lastStatus = 0;
      lastData = { error: { description: String(e?.message ?? e) } };
      break;
    }
  }

  // Неудача — возвращаем сессию в PREBOOKED, чтобы пользователь мог повторить
  await admin
    .from("flight_booking_sessions")
    .update({ status: "PREBOOKED", updated_at: iso(new Date()) })
    .eq("id", session.id);

  console.error(JSON.stringify({ fn: "flights-booking", action: "book", sessionId: session.id, upstreamStatus: lastStatus }));
  if (!lastStatus || lastStatus < 100)
    return err("NETWORK_ERROR", lastData?.error?.description ?? "Network failure", 502);
  if (isSoldOut(lastData)) return err("OFFER_SOLD_OUT", SOLD_OUT_MESSAGE, 409);
  return passthrough(lastStatus, lastData);
}

async function handleGet(admin: any, user: any, body: any) {
  if (body?.sessionId) {
    const loaded = await loadSession(admin, user, body.sessionId);
    if (loaded.error) return loaded.error;
    const session = loaded.session as any;

    return json({
      session: {
        id: session.id,
        status: session.status,
        orderRef: session.order_ref,
        offerId: session.offer_id,
        verifiedPrice: session.verified_price,
        currency: session.currency,
        searchParams: session.search_params,
        verified: session.journey ?? null, // { journey, changes }
        expiresAt: session.expires_at,
        prebookId: session.prebook_id ?? null,
        // secretKey нужен только для checkout-экрана и только до брони
        secretKey: session.status === "PREBOOKED" ? session.secret_key : null,
      },
    });
  }

  if (body?.bookingId) {
    const { data: local } = await admin
      .from("flight_bookings")
      .select("*")
      .eq("booking_id", body.bookingId)
      .maybeSingle();

    if (!local || local.user_id !== user.id)
      return err("BOOKING_NOT_FOUND", "Booking not found", 404);

    const { status, data } = await liteapi(
      `/flights/bookings/${encodeURIComponent(body.bookingId)}`,
      "GET"
    );
    if (status !== 200) return passthrough(status, data);

    return json({ booking: data?.data?.[0] ?? data?.data ?? data, local });
  }

  return err("BAD_REQUEST", "sessionId or bookingId is required");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Платформа проверяет JWT (verify_jwt=true), но нам нужно знать, КТО это
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return err("UNAUTHORIZED", "Unauthorized", 401);

    const body = await req.json().catch(() => ({}));

    switch (body?.action) {
      case "verify":
        return await handleVerify(admin, user, body);
      case "prebook":
        return await handlePrebook(admin, user, body);
      case "book":
        return await handleBook(admin, user, body);
      case "get":
        return await handleGet(admin, user, body);
      default:
        return err("BAD_ACTION", `Unknown action: ${body?.action}`);
    }
  } catch (error: any) {
    console.error(JSON.stringify({ fn: "flights-booking", level: "fatal", message: String(error?.message ?? error) }));
    return err("GATEWAY", error?.message ?? "Unknown error", 500);
  }
});
