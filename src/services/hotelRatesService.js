import { hotelService } from "./SupebaseService";
import { DEFAULT_CURRENCY, getStoredCurrency, isCurrencyError } from "../utils/currency";

export const fetchHotelRatesWithFallback = async (payload, { signal } = {}) => {
  const requestedCurrency = payload.currency || getStoredCurrency();

  try {
    const data = await hotelService.fetchHotelsList(payload, { signal });
    return { data, effectiveCurrency: requestedCurrency };
  } catch (err) {
    if (signal?.aborted || err?.name === "AbortError") throw err;
    if (requestedCurrency !== DEFAULT_CURRENCY && isCurrencyError(err)) {
      const data = await hotelService.fetchHotelsList(
        { ...payload, currency: DEFAULT_CURRENCY },
        { signal },
      );
      return { data, effectiveCurrency: DEFAULT_CURRENCY };
    }
    throw err;
  }
};
