import { supabase } from "../../supabaseClient";
import {
  apiErrorFromData,
  apiErrorFromResponse,
  createAbortError,
} from "../../utils/apiError";

async function invokeTourBooking(payload, { signal } = {}) {
  const response = await supabase.functions.invoke("tours-booking", {
    body: payload,
    ...(signal ? { signal } : {}),
  });

  if (signal?.aborted) throw createAbortError();
  if (response.error) throw await apiErrorFromResponse(response);
  if (response.data?.error) throw apiErrorFromData(response.data);

  return response.data;
}

export const tourBookingService = {
  createPrebooking: (params, options) =>
    invokeTourBooking({ action: "prebook", ...params }, options),
  getPrebooking: (prebookingId, options = {}) => {
    const { signal, ...rest } = options;
    return invokeTourBooking({ action: "get", prebookingId, ...rest }, { signal });
  },
};
