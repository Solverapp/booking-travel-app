import { supabase } from "../../supabaseClient";
import {
  apiErrorFromData,
  apiErrorFromResponse,
  createAbortError,
} from "../../utils/apiError";

const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

const callProxy = async (targetUrl, { method = "POST", body, signal } = {}) => {
  const response = await supabase.functions.invoke("liteapi-proxy", {
    method,
    headers: {
      "x-target-url": targetUrl,
      "x-service-type": "flights",
    },
    ...(body !== undefined ? { body } : {}),
    ...(signal ? { signal } : {}),
  });

  if (signal?.aborted) throw createAbortError();
  if (response.error) throw await apiErrorFromResponse(response);
  if (response.data?.error) throw apiErrorFromData(response.data);

  return response.data;
};

export async function fetchFlightsRates(params, { signal } = {}) {
  return callProxy(`${LITEAPI_BASE}/flights/rates`, {
    method: "POST",
    body: params,
    signal,
  });
}

export async function fetchAirlineList(
  { q = "", limit = 20, alliance, activeOnly = true } = {},
  { signal } = {},
) {
  const qs = new URLSearchParams({ limit: String(limit), activeOnly: String(activeOnly) });
  if (q) qs.set("q", q);
  if (alliance) qs.set("alliance", alliance);
  return callProxy(`${LITEAPI_BASE}/data/flights/airlines?${qs.toString()}`, {
    method: "GET",
    signal,
  });
}

export async function fetchAirportSuggestions(query, { signal } = {}) {
  const term = String(query ?? "").trim();
  if (term.length < 2) return [];

  try {
    const data = await callProxy(
      `${LITEAPI_BASE}/data/flights/airports?q=${encodeURIComponent(term)}`,
      { method: "GET", signal },
    );
    return data?.data?.[0]?.airports ?? [];
  } catch (err) {
    if (signal?.aborted || err?.name === "AbortError") throw err;
    const cached = await fetchAirportsFromCache(term, { signal });
    if (cached.length) return cached;
    throw err;
  }
}

export async function fetchAirportsFromCache(query, { signal } = {}) {
  const safe = String(query ?? "").trim().replace(/[%,()]/g, "");
  if (safe.length < 2) return [];

  let request = supabase
    .from("flight_airports")
    .select("iata, icao, name, city, country, state")
    .or(`iata.ilike.${safe}%,name.ilike.%${safe}%,city.ilike.%${safe}%`)
    .limit(8);

  if (signal) request = request.abortSignal(signal);

  const { data, error } = await request;
  if (error) {
    if (signal?.aborted || error?.name === "AbortError") throw createAbortError();
    return [];
  }
  return data ?? [];
}
