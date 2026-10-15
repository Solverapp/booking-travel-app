import { supabase } from "../supabaseClient";

export const reviewsService = {
  /**
   * Получение отзывов отеля (/data/reviews)
   */
  async fetchReviews({ id, limit = 200 }) {
    const response = await supabase.functions.invoke("liteapi-proxy", {
      method: "GET",
      headers: {
        "x-target-url": `https://api.liteapi.travel/v3.0/data/reviews?hotelId=${id}&limit=${limit}&timeout=4`,
        "x-service-type": "hotels",
      },
    });

    if (response.error) {
      throw new Error(`Supabase System Error: ${response.error.message}`);
    }

    const liteApiData = response.data;

    if (liteApiData?.error) {
      throw new Error(`LiteAPI Error: ${liteApiData.error.message || "Bad Request"}`);
    }

    return liteApiData;
  },
};
