import { supabase } from "../supabaseClient";
import {
  apiErrorFromData,
  apiErrorFromResponse,
  createAbortError,
} from "../utils/apiError";

const invokeHotelsProxy = async (options, signal) => {
  const response = await supabase.functions.invoke("liteapi-proxy", {
    ...options,
    ...(signal ? { signal } : {}),
  });

  if (signal?.aborted) throw createAbortError();
  if (response.error) throw await apiErrorFromResponse(response);
  if (response.data?.error) throw apiErrorFromData(response.data);

  return response.data;
};

export const hotelService = {
  async fetchHotelsList(params, { signal } = {}) {
    return invokeHotelsProxy(
      {
        method: "POST",
        headers: {
          "x-target-url": "https://api.liteapi.travel/v3.0/hotels/rates",
          "x-service-type": "hotels",
        },
        body: params,
      },
      signal,
    );
  },

  async fetchChainsForPlace(placeId, { signal } = {}) {
    if (!placeId) return [];

    const targetUrl = `https://api.liteapi.travel/v3.0/data/hotels?placeId=${encodeURIComponent(placeId)}&limit=5000`;
    const liteApiData = await invokeHotelsProxy(
      {
        method: "GET",
        headers: {
          "x-target-url": targetUrl,
          "x-service-type": "hotels",
        },
      },
      signal,
    );

    const hotels = Array.isArray(liteApiData?.data) ? liteApiData.data : [];
    const chainsById = new Map();

    hotels.forEach((hotel) => {
      const id = Number(hotel?.chainId);
      const name = String(hotel?.chain || "").trim();
      if (!id || !name || name === "Not Available") return;

      const current = chainsById.get(id);
      chainsById.set(id, {
        id,
        name,
        count: (current?.count || 0) + 1,
      });
    });

    return [...chainsById.values()];
  },
};
