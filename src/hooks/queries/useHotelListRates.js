import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchHotelRatesWithFallback } from "../../services/hotelRatesService";
import {
  buildHotelRatesBody,
  hotelFiltersKey,
  hotelOccupancyKey,
  hotelStayKey,
} from "../../utils/queryParams";
import { queryKeys } from "../../utils/queryKeys";
import { useDebouncedValue } from "../useDebouncedValue";

export const useHotelListRates = ({ search, filters, currency, enabled = true }) => {
  const debouncedFilters = useDebouncedValue(filters, 400);
  const filtersKey = useMemo(
    () => hotelFiltersKey(debouncedFilters),
    [debouncedFilters],
  );
  const stayKey = hotelStayKey(search);
  const occupancyKey = hotelOccupancyKey(search);
  const placeId = search.placeId;
  const canFetch = Boolean(
    enabled && placeId && search.checkIn && search.checkOut,
  );

  const query = useQuery({
    queryKey: queryKeys.hotelPlaceRates({
      placeId,
      stayKey,
      occupancyKey,
      currency,
      filtersKey,
    }),
    queryFn: ({ signal }) => {
      const body = buildHotelRatesBody({
        search,
        filters: debouncedFilters,
        currency,
        maxRatesPerHotel: 1,
        limit: 5000,
      });
      return fetchHotelRatesWithFallback(body, { signal });
    },
    enabled: canFetch,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    structuralSharing: false,
  });

  return { ...query, effectiveCurrency: query.data?.effectiveCurrency ?? currency };
};
