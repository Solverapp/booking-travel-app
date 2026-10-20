// Создаёт round-trip сессию в статусе PREBOOKED (для CDP-проверки чекаута)
// Запуск: node --env-file=.env scripts/flights-roundtrip-prebook.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const EMAIL = process.env.FLIGHTS_TEST_EMAIL;
const PASSWORD = process.env.FLIGHTS_TEST_PASSWORD;
const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

const die = (m) => { console.error("FAILED:", m); process.exit(1); };
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const datePlus = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authError) die(authError.message);

const searchParams = {
  legs: [
    { origin: "LON", destination: "PAR", date: datePlus(30), direction: "OUTBOUND" },
    { origin: "PAR", destination: "LON", date: datePlus(37), direction: "INBOUND" },
  ],
  adults: 1, children: 0, infants: 0, cabin: "all", trip: "round", currency: "AED", country: "AE",
};

const searchRes = await supabase.functions.invoke("liteapi-proxy", {
  method: "POST",
  headers: { "x-target-url": `${LITEAPI_BASE}/flights/rates`, "x-service-type": "flights" },
  body: searchParams,
});
if (searchRes.error) die(searchRes.error.message);
const journeys = asArray(asArray(searchRes.data?.data)[0]?.journeys);
const offers = journeys.flatMap((j) => asArray(j?.offers)).filter((o) => o?.offerId);
console.log(`[search] ${offers.length} offers`);

const invokeRaw = async (payload) => {
  const res = await supabase.functions.invoke("flights-booking", { body: payload });
  let body = res.data ?? null;
  if (res.error) {
    try { body = await res.error.context?.json?.(); } catch { body = null; }
  }
  return { ok: !res.error && !res.data?.error, code: body?.error?.code ?? null, data: body, message: body?.error?.message ?? res.error?.message };
};

let verified = null;
for (const offer of offers.slice(0, 12)) {
  const res = await invokeRaw({ action: "verify", offerId: offer.offerId, searchParams });
  if (res.ok) { verified = res.data; break; }
  console.log(`[verify] skipped (${res.code}): ${res.message}`);
}
if (!verified) die("no offer verified");

if (process.env.STOP_AFTER_VERIFY) {
  console.log(`SESSION_ID=${verified.sessionId}`);
  console.log("STOP_AFTER_VERIFY: prebook skipped");
  process.exit(0);
}

const contact = { firstName: "Michael", lastName: "Anderson", email: EMAIL, phoneNumber: "501234567", phoneCountryCode: "971" };
const passenger = {
  passengerType: 0, title: "MR", firstName: "Michael", lastName: "Anderson",
  birthday: datePlus(-365 * 30), gender: "M", nationality: "AE",
  documentType: "passport", documentNumber: "X1234567", documentIssueCountry: "AE",
  documentExpiry: datePlus(365 * 3),
};
const prebook = await invokeRaw({ action: "prebook", sessionId: verified.sessionId, contact, passengers: [passenger] });
if (!prebook.ok) die(`prebook: ${prebook.code} ${prebook.message}`);
console.log(`SESSION_ID=${verified.sessionId}`);
console.log(`PREBOOK_ID=${prebook.data.prebookId}`);
