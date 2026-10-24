import { supabase } from "../supabaseClient";

const BASE_URL = "https://api.liteapi.travel/v3.0/data";

export const placesService = {
  async fetchPlacesList({
    query,
    types = "political,locality,geocode,hotel",
    language = "en",
    signal,
  } = {}) {
    const textQuery = String(query ?? "").trim();
    if (!textQuery) return [];

    const params = new URLSearchParams({
      textQuery,
      type: types,
      language,
    });

    const response = await supabase.functions.invoke("liteapi-proxy", {
      method: "GET",
      headers: {
        "x-target-url": `${BASE_URL}/places?${params.toString()}`,
        "x-service-type": "hotels",
      },
      ...(signal ? { signal } : {}),
    });

    if (response.error) {
      throw new Error(`Supabase System Error: ${response.error.message}`);
    }

    const liteApiData = response.data;

    if (liteApiData?.error) {
      throw new Error(
        `LiteAPI Error: ${liteApiData.error.message || liteApiData.error || "Bad Request"}`,
      );
    }

    return Array.isArray(liteApiData?.data) ? liteApiData.data : [];
  },
};
