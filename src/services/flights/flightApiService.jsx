import { supabase } from "../../supabaseClient";

const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

// Общий вызов прокси для flights (API-ключ живёт только в edge function)
const callProxy = async (targetUrl, { method = "POST", body } = {}) => {
  const response = await supabase.functions.invoke("liteapi-proxy", {
    method,
    headers: {
      "x-target-url": targetUrl,
      "x-service-type": "flights",
    },
    ...(body !== undefined ? { body } : {}),
  });

  if (response.error) {
    throw new Error(`Supabase System Error: ${response.error.message}`);
  }

  const liteApiData = response.data;

  if (liteApiData?.error) {
    throw new Error(
      `LiteAPI Error: ${liteApiData.error.message || liteApiData.error.description || "Bad Request"}`
    );
  }

  return liteApiData;
};

// 1. Поиск рейсов (one-way / round-trip) → journeys[] с offers[]
export async function fetchFlightsRates(params) {
  return callProxy(`${LITEAPI_BASE}/flights/rates`, { method: "POST", body: params });
}

// 2. Справочник авиакомпаний (логотипы уже в rates, тут — доп. данные)
export async function fetchAirlineList({ q = "", limit = 20, alliance, activeOnly = true } = {}) {
  const qs = new URLSearchParams({ limit: String(limit), activeOnly: String(activeOnly) });
  if (q) qs.set("q", q);
  if (alliance) qs.set("alliance", alliance);
  return callProxy(`${LITEAPI_BASE}/data/flights/airlines?${qs.toString()}`, { method: "GET" });
}

// 3. Автокомплит аэропортов: LiteAPI (primary) → кэш в БД (fallback)
export async function fetchAirportSuggestions(query) {
  const term = String(query ?? "").trim();
  if (term.length < 2) return [];

  try {
    const data = await callProxy(
      `${LITEAPI_BASE}/data/flights/airports?q=${encodeURIComponent(term)}`,
      { method: "GET" }
    );
    return data?.data?.[0]?.airports ?? [];
  } catch (err) {
    const cached = await fetchAirportsFromCache(term);
    if (cached.length) return cached;
    throw err;
  }
}

// Fallback: кэш аэропортов в БД (наполняется liteapi-proxy через service-role)
export async function fetchAirportsFromCache(query) {
  const safe = String(query ?? "").trim().replace(/[%,()]/g, "");
  if (safe.length < 2) return [];

  const { data, error } = await supabase
    .from("flight_airports")
    .select("iata, icao, name, city, country, state")
    .or(`iata.ilike.${safe}%,name.ilike.%${safe}%,city.ilike.%${safe}%`)
    .limit(8);

  if (error) return [];
  return data ?? [];
}
