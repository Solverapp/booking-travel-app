// ============================================================
// Round-trip flow probe: search → verify → prebook → book
// Запуск: node --env-file=.env scripts/flights-roundtrip-flow.mjs
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
const step = (name, message) => console.log(`[${name}] ${message}`);
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const datePlus = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function invokeProxy(targetUrl, body) {
  const res = await supabase.functions.invoke("liteapi-proxy", {
    method: "POST",
    headers: { "x-target-url": targetUrl, "x-service-type": "flights" },
    body,
  });
  if (res.error) die(`liteapi-proxy error: ${res.error.message}`);
  if (res.data?.error) die(`proxy upstream error: ${JSON.stringify(res.data.error)}`);
  return res.data;
}

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
const invokeBooking = async (payload) => {
  const res = await invokeBookingRaw(payload);
  if (!res.ok) die(`flights-booking [${payload.action}]: ${res.code} ${res.message}`);
  return res.data;
};

const { error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authError) die(`signIn failed: ${authError.message}`);
step("auth", "OK");

const legs = [
  { origin: "LON", destination: "PAR", date: datePlus(30), direction: "OUTBOUND" },
  { origin: "PAR", destination: "LON", date: datePlus(37), direction: "INBOUND" },
];
const searchParams = { legs, adults: 1, currency: "AED", country: "AE", trip: "round", children: 0, infants: 0, cabin: "all" };
step("search", `LON→PAR round trip ${legs[0].date} / ${legs[1].date}`);
const searchData = await invokeProxy(`${LITEAPI_BASE}/flights/rates`, searchParams);
const root = asArray(searchData?.data)[0] ?? {};
const journeys = asArray(root?.journeys);
const offers = journeys.flatMap((j) => asArray(j?.offers)).filter((o) => o?.offerId);
if (!offers.length) die("no offers");
step("search", `OK — ${journeys.length} journeys, ${offers.length} offers`);

// verify с перебором (sandbox: sold out)
let verified = null;
let last = null;
for (const offer of offers.slice(0, 12)) {
  const res = await invokeBookingRaw({ action: "verify", offerId: offer.offerId, searchParams });
  if (res.ok) {
    verified = res.data;
    break;
  }
  last = res;
  step("verify", `offer skipped (${res.code}): ${res.message}`);
}
if (!verified) die(`no offer verified. last: ${last?.code} ${last?.message}`);
step("verify", `OK — sessionId=${verified.sessionId}, price=${verified.journey?.pricing?.display?.total}`);

const vSegs = asArray(verified.journey?.segments);
step("verify", `segments=${vSegs.length} dirs=${vSegs.map((s) => s?.direction).join(",")}`);

// get страницы
const pageState = await invokeBooking({ action: "get", sessionId: verified.sessionId });
const stored = asArray(pageState?.session?.verified?.journey?.segments);
step("get", `OK — status=${pageState?.session?.status}, stored segments=${stored.length} dirs=${stored.map((s) => s?.direction).join(",")}`);

// prebook
const contact = { firstName: "Michael", lastName: "Anderson", email: EMAIL, phoneNumber: "501234567", phoneCountryCode: "971" };
const passenger = {
  passengerType: 0,
  title: "MR",
  firstName: "Michael",
  lastName: "Anderson",
  birthday: datePlus(-365 * 30),
  gender: "M",
  nationality: "AE",
  documentType: "passport",
  documentNumber: "X1234567",
  documentIssueCountry: "AE",
  documentExpiry: datePlus(365 * 3),
};
const prebooked = await invokeBooking({ action: "prebook", sessionId: verified.sessionId, contact, passengers: [passenger] });
step("prebook", `OK — prebookId=${prebooked.prebookId}, secretKey=${prebooked.secretKey ? "received" : "MISSING"}`);

const booked = await invokeBooking({ action: "book", sessionId: verified.sessionId });
step("book", `OK — bookingId=${booked.bookingId}, ref=${booked.bookingRef}, PNR=${booked.pnr ?? "-"}, total=${booked.total} ${booked.currency}`);
step("book", `meta.segments=${asArray(booked.meta?.segments).length} dirs=${asArray(booked.meta?.segments).map((s) => s?.direction).join(",")}`);

const { data: rows, error: rowsError } = await supabase
  .from("bookings")
  .select("name, sum, currency, meta, reference, status")
  .eq("order_ref", verified.orderRef);
if (rowsError) die(`bookings select: ${rowsError.message}`);
if (!rows?.length) die("bookings row not found");
step("bookings", `OK — "${rows[0].name}" ${rows[0].sum} ${rows[0].currency} ref=${rows[0].reference} status=${rows[0].status}`);
step("bookings", `meta.passengerList=${asArray(rows[0].meta?.passengerList).length} trip=${rows[0].meta?.trip}`);

console.log("\nALL STEPS PASSED");
