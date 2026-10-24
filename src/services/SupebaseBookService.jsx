import { supabase } from "../supabaseClient";
import {
  apiErrorFromData,
  apiErrorFromResponse,
  createAbortError,
} from "../utils/apiError";

export const hotelBookService = {
  async fetchBook(params, { signal } = {}) {
    const response = await supabase.functions.invoke("hotels-booking", {
      method: "POST",
      body: params,
      ...(signal ? { signal } : {}),
    });

    if (signal?.aborted) throw createAbortError();
    if (response.error) throw await apiErrorFromResponse(response);
    if (response.data?.error) throw apiErrorFromData(response.data);

    return response.data;
  },
};
