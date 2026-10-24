import { supabase } from "../../supabaseClient";
import {
  apiErrorFromData,
  apiErrorFromResponse,
  createAbortError,
} from "../../utils/apiError";

async function invokeFlightBooking(payload, { signal } = {}) {
  const response = await supabase.functions.invoke("flights-booking", {
    body: payload,
    ...(signal ? { signal } : {}),
  });

  if (signal?.aborted) throw createAbortError();
  if (response.error) throw await apiErrorFromResponse(response);
  if (response.data?.error) throw apiErrorFromData(response.data);

  return response.data;
}

export const flightsBookingService = {
  verifyFlight: (params, options) => invokeFlightBooking({ action: "verify", ...params }, options),
  prebookFlight: (params, options) => invokeFlightBooking({ action: "prebook", ...params }, options),
  attachFlightServices: (params, options) =>
    invokeFlightBooking({ action: "attachServices", ...params }, options),
  bookFlight: (params, options) => invokeFlightBooking({ action: "book", ...params }, options),
  getFlightSession: (sessionId, options = {}) => {
    const { signal, ...rest } = options;
    return invokeFlightBooking({ action: "get", sessionId, ...rest }, { signal });
  },
};
