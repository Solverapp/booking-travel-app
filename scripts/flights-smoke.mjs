// ============================================================
// Flights E2E smoke: auth → airports → search → verify → prebook → book
// + мультипассажирский flow (adult + child + infant) с негативными проверками
// Запуск: node --env-file=.env scripts/flights-smoke.mjs
// Требует: FLIGHTS_TEST_EMAIL / FLIGHTS_TEST_PASSWORD, деплой functions
// ============================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const EMAIL = process.env.FLIGHTS_TEST_EMAIL;
const PASSWORD = process.env.FLIGHTS_TEST_PASSWORD;
const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

function die(message) {
  console.error(`\nFAILED: ${message}`);
  process.exit(1);
}

function step(name, message) {
  console.log(`[${name}] ${message}`);
}

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const datePlus = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const yearsAgo = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  die("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Run: node --env-file=.env scripts/flights-smoke.mjs");
}
if (!EMAIL || !PASSWORD) die("Missing FLIGHTS_TEST_EMAIL / FLIGHTS_TEST_PASSWORD in .env");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function invokeProxy(targetUrl, body) {
  const res = await supabase.functions.invoke("liteapi-proxy", {
    method: body === undefined ? "GET" : "POST",
    headers: { "x-target-url": targetUrl, "x-service-type": "flights" },
    ...(body !== undefined ? { body } : {}),
  });
  if (res.error) die(`liteapi-proxy error: ${res.error.message}`);
  if (res.data?.error) die(`proxy upstream error: ${JSON.stringify(res.data.error)}`);
  return res.data;
}

async function invokeBooking(payload) {
  const res = await supabase.functions.invoke("flights-booking", { body: payload });
  if (res.error) {
    let body = null;
    try {
      body = await res.error.context?.json?.();
    } catch {
      // тело ответа не JSON — остаётся null
    }
    die(`flights-booking [${payload.action}] error: ${body?.error?.code ?? ""} ${body?.error?.message ?? res.error.message}`);
  }
  if (res.data?.error) die(`flights-booking [${payload.action}] envelope error: ${JSON.stringify(res.data.error)}`);
  return res.data;
}

// Вариант без die — для негативных проверок (ожидаем ошибку)
async function invokeBookingRaw(payload) {
  const res = await supabase.functions.invoke("flights-booking", { body: payload });
  let body = res.data ?? null;
  if (res.error) {
    try {
      body = await res.error.context?.json?.();
    } catch {
      body = null;
    }
  }
  return {
    ok: !res.error && !res.data?.error,
    code: body?.error?.code ?? null,
    message: body?.error?.message ?? res.error?.message ?? null,
    data: body,
  };
}

// Sandbox-офферы бывают sold out — verify перебирает офферы по очереди
async function verifyFirstAvailable(offers, searchParams, label) {
  let lastError = null;
  for (const candidate of offers.slice(0, 12)) {
    const res = await invokeBookingRaw({ action: "verify", offerId: candidate.offerId, searchParams });
    if (res.ok) return res.data;
    lastError = res;
    step(label, `offer skipped (${res.code ?? "?"}): ${res.message ?? "unknown error"}`);
  }
  die(`${label}: no offer could be verified. Last error: ${lastError?.code ?? "?"} ${lastError?.message ?? ""}`);
}

// ------------------------------------------------------------
// Мультипассажиры: adult + child + infant (Sprint 4)
// ------------------------------------------------------------
async function multiPaxFlow() {
  console.log("\n--- MULTI-PAX FLOW (adult + child + infant) ---");

  const legs = [{ origin: "LON", destination: "PAR", date: datePlus(30), direction: "OUTBOUND" }];
  const searchParams = { legs, adults: 1, children: 1, infants: 1, currency: "AED", country: "AE" };
  step("pax search", `POST /flights/rates ${legs[0].origin}→${legs[0].destination} on ${legs[0].date} (1 adult, 1 child, 1 infant)`);
  const searchData = await invokeProxy(`${LITEAPI_BASE}/flights/rates`, searchParams);

  const root = asArray(searchData?.data)[0] ?? searchData ?? {};
  const journeys = asArray(root?.journeys);
  const offers = journeys.flatMap((j) => asArray(j?.offers)).filter((o) => o?.offerId);
  if (offers.length === 0) die(`multi-pax search: no offers (journeys=${journeys.length})`);
  step("pax search", `OK — ${offers.length} offers, e.g. ${offers[0]?.pricing?.display?.total ?? "?"} ${offers[0]?.pricing?.display?.currency ?? ""}`);

  step("pax verify", "POST /flights/verify");
  const verified = await verifyFirstAvailable(offers, searchParams, "pax verify");
  step("pax verify", `OK — sessionId=${verified.sessionId}`);

  const pageState = await invokeBooking({ action: "get", sessionId: verified.sessionId });
  const sp = pageState?.session?.searchParams ?? {};
  if (sp.adults !== 1 || sp.children !== 1 || sp.infants !== 1)
    die(`searchParams mismatch: ${JSON.stringify(sp)}`);
  step("pax get", `OK — adults=${sp.adults}, children=${sp.children}, infants=${sp.infants}`);

  const contact = {
    firstName: "Michael",
    lastName: "Anderson",
    email: EMAIL,
    phoneNumber: "501234567",
    phoneCountryCode: "971",
  };
  const basePassenger = (overrides) => ({
    title: "MR",
    firstName: "Michael",
    lastName: "Anderson",
    gender: "M",
    nationality: "AE",
    documentType: "passport",
    documentNumber: "X1234567",
    documentIssueCountry: "AE",
    documentExpiry: datePlus(365 * 3),
    ...overrides,
  });
  const adult = basePassenger({ passengerType: 0, birthday: yearsAgo(30) });
  const child = basePassenger({
    title: "MS",
    firstName: "Emma",
    gender: "F",
    documentNumber: "X7654321",
    passengerType: 1,
    birthday: yearsAgo(8),
  });
  const infant = basePassenger({
    title: "MISS",
    firstName: "Nora",
    gender: "F",
    documentNumber: "X1122334",
    passengerType: 2,
    birthday: yearsAgo(1),
  });

  // Негатив 1: число пассажиров не совпадает с поиском
  const wrongCount = await invokeBookingRaw({
    action: "prebook",
    sessionId: verified.sessionId,
    contact,
    passengers: [adult],
  });
  if (wrongCount.ok || wrongCount.code !== "BAD_REQUEST")
    die(`expected BAD_REQUEST for wrong passenger count, got code=${wrongCount.code} message=${wrongCount.message}`);
  step("pax prebook", `OK — wrong count rejected: ${wrongCount.message}`);

  // Негатив 2: passengerType не совпадает с позицией (ребёнок отправлен как взрослый)
  const wrongType = await invokeBookingRaw({
    action: "prebook",
    sessionId: verified.sessionId,
    contact,
    passengers: [adult, { ...child, passengerType: 0 }, infant],
  });
  if (wrongType.ok || wrongType.code !== "BAD_REQUEST")
    die(`expected BAD_REQUEST for passengerType mismatch, got code=${wrongType.code} message=${wrongType.message}`);
  step("pax prebook", `OK — type mismatch rejected: ${wrongType.message}`);

  // Негатив 3: DOB не соответствует типу (взрослый с детской датой рождения)
  const wrongDob = await invokeBookingRaw({
    action: "prebook",
    sessionId: verified.sessionId,
    contact,
    passengers: [adult, { ...child, birthday: yearsAgo(30) }, infant],
  });
  if (wrongDob.ok || wrongDob.code !== "BAD_REQUEST")
    die(`expected BAD_REQUEST for DOB mismatch, got code=${wrongDob.code} message=${wrongDob.message}`);
  step("pax prebook", `OK — DOB mismatch rejected: ${wrongDob.message}`);

  // Основной путь: корректный prebook (adult + child + infant)
  const prebooked = await invokeBooking({
    action: "prebook",
    sessionId: verified.sessionId,
    contact,
    passengers: [adult, child, infant],
  });
  step("pax prebook", `OK — prebookId=${prebooked.prebookId}, secretKey=${prebooked.secretKey ? "received" : "MISSING"}`);

  const booked = await invokeBooking({ action: "book", sessionId: verified.sessionId });
  step("pax book", `OK — bookingId=${booked.bookingId}, ref=${booked.bookingRef}, PNR=${booked.pnr ?? "-"}, status=${booked.status}`);

  const { data: rows, error: rowsError } = await supabase
    .from("bookings")
    .select("name, sum, meta")
    .eq("order_ref", verified.orderRef);
  if (rowsError) die(`multi-pax bookings select failed: ${rowsError.message}`);
  if (!rows?.length) die("multi-pax bookings row not found");
  if (rows[0]?.meta?.passengers !== 3)
    die(`meta.passengers expected 3, got ${rows[0]?.meta?.passengers}`);
  const paxList = asArray(rows[0]?.meta?.passengerList);
  if (paxList.length !== 3)
    die(`meta.passengerList expected 3, got ${paxList.length}`);
  if (!paxList[0]?.firstName || !paxList[0]?.documentNumber)
    die(`meta.passengerList[0] missing name/document: ${JSON.stringify(paxList[0])}`);
  if (rows[0]?.meta?.contact?.email !== contact.email)
    die(`meta.contact.email expected ${contact.email}, got ${rows[0]?.meta?.contact?.email}`);
  step("pax bookings", `OK — meta.passengers=3, passengerList=3, contact.email=${rows[0].meta.contact.email}, sum=${rows[0].sum}`);
}

async function main() {
  // 0. Auth
  step("auth", `signing in as ${EMAIL}...`);
  const { error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authError) die(`signIn failed: ${authError.message}`);
  step("auth", "OK");

  // 1. Airports autocomplete
  step("airports", 'GET /data/flights/airports?q=London');
  const airportsData = await invokeProxy(`${LITEAPI_BASE}/data/flights/airports?q=London`, undefined);
  const airports = asArray(asArray(airportsData?.data)[0]?.airports ?? airportsData?.data?.airports ?? airportsData);
  if (airports.length === 0) die(`no airports returned: ${JSON.stringify(airportsData).slice(0, 500)}`);
  step("airports", `OK — ${airports.length} results, e.g. ${airports[0]?.iata} ${airports[0]?.name ?? ""}`);

  // 2. Search (sandbox: Nuitee Air, E2E-маршрут LON → PAR)
  const legs = [{ origin: "LON", destination: "PAR", date: datePlus(30), direction: "OUTBOUND" }];
  const searchParams = { legs, adults: 1, currency: "AED", country: "AE" };
  step("search", `POST /flights/rates ${legs[0].origin}→${legs[0].destination} on ${legs[0].date}`);
  const searchData = await invokeProxy(`${LITEAPI_BASE}/flights/rates`, searchParams);

  const root = asArray(searchData?.data)[0] ?? searchData ?? {};
  const journeys = asArray(root?.journeys);
  const offers = journeys.flatMap((j) => asArray(j?.offers)).filter((o) => o?.offerId);
  if (offers.length === 0) {
    die(`no offers found. keys=${JSON.stringify(Object.keys(root))} sample=${JSON.stringify(root).slice(0, 800)}`);
  }
  step("search", `OK — ${journeys.length} journeys, ${offers.length} offers, e.g. ${offers[0]?.pricing?.display?.total ?? "?"} ${offers[0]?.pricing?.display?.currency ?? ""}`);

  // 3. Verify (серверная сессия)
  step("verify", "POST /flights/verify");
  const verified = await verifyFirstAvailable(offers, searchParams, "verify");
  step("verify", `OK — sessionId=${verified.sessionId}, price=${verified.journey?.pricing?.display?.total} ${verified.journey?.pricing?.display?.currency}${verified.changes ? ", CHANGES PRESENT" : ""}`);

  // 3b. Форма данных для /flightpage/:sessionId (Sprint 3)
  const pageState = await invokeBooking({ action: "get", sessionId: verified.sessionId });
  const pageSession = pageState?.session ?? {};
  if (pageSession.status !== "VERIFIED") die(`expected VERIFIED, got ${pageSession.status}`);
  const pageSegments = asArray(pageSession?.verified?.journey?.segments);
  if (pageSegments.length === 0) die("get: verified.journey.segments is empty — /flightpage has nothing to render");
  if (!pageSession?.searchParams?.adults) die("get: searchParams.adults missing — passenger form cannot be built");
  step("get", `OK — VERIFIED, segments=${pageSegments.length}, adults=${pageSession.searchParams.adults}, changes=${pageSession.verified?.changes ? "yes" : "no"}`);

  // 4. Prebook (usePaymentSdk → Stripe intent)
  step("prebook", "POST /flights/prebooks (usePaymentSdk)");
  const prebooked = await invokeBooking({
    action: "prebook",
    sessionId: verified.sessionId,
    contact: {
      firstName: "Michael",
      lastName: "Anderson",
      email: EMAIL,
      phoneNumber: "501234567",
      phoneCountryCode: "971",
    },
    passengers: [
      {
        title: "MR",
        firstName: "Michael",
        lastName: "Anderson",
        birthday: "1990-01-01",
        gender: "M",
        nationality: "AE",
        documentType: "passport",
        documentNumber: "X1234567",
        documentIssueCountry: "AE",
        documentExpiry: "2030-01-01",
      },
    ],
  });
  step("prebook", `OK — prebookId=${prebooked.prebookId}, secretKey=${prebooked.secretKey ? "received" : "MISSING"}`);

  // 4b. Форма данных для /flightcheckout/:sessionId (Sprint 3)
  const prebookedState = await invokeBooking({ action: "get", sessionId: verified.sessionId });
  if (prebookedState?.session?.status !== "PREBOOKED") die(`expected PREBOOKED after prebook, got ${prebookedState?.session?.status}`);
  if (!prebookedState?.session?.secretKey) die("checkout page needs secretKey on PREBOOKED session");
  step("get", "OK — PREBOOKED, secretKey present for Payment SDK");

  // 5. Book
  step("book", "POST /flights/bookings");
  const booked = await invokeBooking({ action: "book", sessionId: verified.sessionId });
  step("book", `OK — bookingId=${booked.bookingId}, ref=${booked.bookingRef}, PNR=${booked.pnr ?? "-"}, status=${booked.status}`);

  // 6. Idempotency
  step("book", "repeat call (idempotency check)");
  const bookedAgain = await invokeBooking({ action: "book", sessionId: verified.sessionId });
  if (bookedAgain.bookingId !== booked.bookingId) die("idempotency failed: different bookingId on second call");
  step("book", `OK — reused=${bookedAgain.reused === true}, bookingId=${bookedAgain.bookingId}`);

  // 7. Session state
  const sessionState = await invokeBooking({ action: "get", sessionId: verified.sessionId });
  step("get", `OK — status=${sessionState.session?.status}`);
  if (sessionState.session?.status !== "CONFIRMED") die(`expected CONFIRMED, got ${sessionState.session?.status}`);
  if (sessionState.session?.secretKey) die("secretKey must be null after CONFIRMED");

  // 8. bookings row (RLS: пользователь видит свою запись)
  const { data: orderRows, error: orderError } = await supabase
    .from("bookings")
    .select("id, name, sum, Service, status, reference, order_ref, currency")
    .eq("order_ref", verified.orderRef);
  if (orderError) die(`bookings select failed: ${orderError.message}`);
  if (!orderRows?.length) die("bookings row not found (insert or RLS issue)");
  step("bookings", `OK — "${orderRows[0].name}" sum=${orderRows[0].sum} ${orderRows[0].currency} Service=${orderRows[0].Service}`);

  // 9. Мультипассажирский flow (adult + child + infant)
  await multiPaxFlow();

  console.log("\nALL STEPS PASSED");
}

main().catch((e) => die(e?.stack ?? String(e)));
