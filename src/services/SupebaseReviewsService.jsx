import { supabase } from "../supabaseClient";
import {
  apiErrorFromData,
  apiErrorFromResponse,
  createAbortError,
} from "../utils/apiError";

export const reviewsService = {
  async fetchReviews({ id, limit = 200 }, { signal } = {}) {
    const response = await supabase.functions.invoke("liteapi-proxy", {
      method: "GET",
      headers: {
        "x-target-url": `https://api.liteapi.travel/v3.0/data/reviews?hotelId=${id}&limit=${limit}&timeout=4`,
        "x-service-type": "hotels",
      },
      ...(signal ? { signal } : {}),
    });

    if (signal?.aborted) throw createAbortError();
    if (response.error) throw await apiErrorFromResponse(response);
    if (response.data?.error) throw apiErrorFromData(response.data);

    return response.data;
  },
};
