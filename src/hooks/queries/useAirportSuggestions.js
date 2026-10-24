import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchAirportSuggestions } from "../../services/flights/flightApiService";
import { queryKeys } from "../../utils/queryKeys";

export const useAirportSuggestions = (term) => {
  const normalized = String(term ?? "").trim();

  return useQuery({
    queryKey: queryKeys.airports(normalized.toLowerCase()),
    queryFn: ({ signal }) => fetchAirportSuggestions(normalized, { signal }),
    enabled: normalized.length >= 2,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    placeholderData: keepPreviousData,
  });
};
