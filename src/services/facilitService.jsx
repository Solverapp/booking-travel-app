import { supabase } from "../supabaseClient";

export const facilitService = {
  async fetchFacilitiesList() {
    const response = await supabase.functions.invoke("liteapi-proxy", {
      method: "GET",
      headers: {
        "x-target-url": "https://api.liteapi.travel/v3.0/data/facilities?lang=en",
        "x-service-type": "hotels",
      },
    });

    if (response.error) {
      throw new Error(`Supabase System Error: ${response.error.message}`);
    }

    return response.data;
  },
};
