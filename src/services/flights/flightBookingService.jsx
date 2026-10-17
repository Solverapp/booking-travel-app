import { supabase } from "../../supabaseClient";

// Все действия идут в edge function flights-booking (verify_jwt=true).
// offerId / prebookId / transactionId на клиент не возвращаются — только sessionId
// (и secretKey для Payment SDK на шаге оплаты).
async function invokeFlightBooking(payload) {
  const response = await supabase.functions.invoke("flights-booking", { body: payload });

  if (response.error) {
    // При не-2xx supabase-js кидает FunctionsHttpError, тело ответа функции — в error.context
    let errorBody = null;
    try {
      errorBody = await response.error.context?.json?.();
    } catch {
      // тело ответа не JSON — остаётся null
    }

    const error = new Error(
      `Flights Error: ${errorBody?.error?.message || response.error.message || "Booking service error"}`
    );
    error.code = errorBody?.error?.code || response.error.name || "FUNCTIONS_ERROR";
    error.status = response.error.context?.status ?? response.response?.status;
    throw error;
  }

  const data = response.data;
  if (data?.error) {
    const error = new Error(`Flights Error: ${data.error.message || "Bad Request"}`);
    error.code = data.error.code || "FLIGHTS_ERROR";
    throw error;
  }

  return data;
}

export const flightsBookingService = {
  // Проверка офера + создание серверной сессии → { sessionId, orderRef, journey, changes }
  verifyFlight: (params) => invokeFlightBooking({ action: "verify", ...params }),

  // Prebook с usePaymentSdk → { prebookId, secretKey }; повторный вызов возвращает тот же prebook
  prebookFlight: (params) => invokeFlightBooking({ action: "prebook", ...params }),

  // Финальная бронь после успешной оплаты (идемпотентна)
  bookFlight: (params) => invokeFlightBooking({ action: "book", ...params }),

  // Чтение состояния сессии/брони (refresh-safe для checkout-экрана)
  getFlightSession: (sessionId) => invokeFlightBooking({ action: "get", sessionId }),
};
