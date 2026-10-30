import { supabase } from "../../supabaseClient";
import {
  apiErrorFromData,
  apiErrorFromResponse,
  createAbortError,
} from "../../utils/apiError";

async function invokeTourPayment(payload, { signal } = {}) {
  const response = await supabase.functions.invoke("tours-payment", {
    body: payload,
    ...(signal ? { signal } : {}),
  });

  if (signal?.aborted) throw createAbortError();
  if (response.error) throw await apiErrorFromResponse(response);
  if (response.data?.error) throw apiErrorFromData(response.data);

  return response.data;
}

export const tourPaymentService = {
  createIntent: (prebookingId, options) =>
    invokeTourPayment({ action: "createIntent", prebookingId }, options),
  getStatus: (prebookingId, options) =>
    invokeTourPayment({ action: "status", prebookingId }, options),
  sync: (prebookingId, options) =>
    invokeTourPayment({ action: "sync", prebookingId }, options),
};
