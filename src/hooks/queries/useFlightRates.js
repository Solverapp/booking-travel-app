import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchFlightsRates } from "../../services/flights/flightApiService";
import { buildRatesRequest } from "../../utils/flightSearch";
import { DEFAULT_CURRENCY, isCurrencyError } from "../../utils/currency";
import { queryKeys } from "../../utils/queryKeys";

const fetchRatesWithCurrencyFallback = async (params, { signal } = {}) => {
  const request = buildRatesRequest(params);

  try {
    return await fetchFlightsRates(request, { signal });
  } catch (err) {
    if (signal?.aborted || err?.name === "AbortError") throw err;
    if (request.currency !== DEFAULT_CURRENCY && isCurrencyError(err)) {
      return fetchFlightsRates(buildRatesRequest(params, { currency: DEFAULT_CURRENCY }), {
        signal,
      });
    }
    throw err;
  }
};

export const useFlightRates = ({ params, enabled = true }) => {
  const request = buildRatesRequest(params);

  return useQuery({
    queryKey: queryKeys.flightRates(request),
    queryFn: ({ signal }) => fetchRatesWithCurrencyFallback(params, { signal }),
    enabled: Boolean(enabled && params.origin && params.destination && params.depart),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    structuralSharing: false,
  });
};
