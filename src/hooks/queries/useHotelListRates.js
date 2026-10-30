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
import { resolveNationality } from "../../utils/nationality";
import { useDebouncedValue } from "../useDebouncedValue";

export const useHotelListRates = ({
  search,
  filters,
  currency,
  nationality,
  enabled = true,
}) => {
  const debouncedFilters = useDebouncedValue(filters, 400);
  const filtersKey = useMemo(
    () => hotelFiltersKey(debouncedFilters),
    [debouncedFilters],
  );
  const stayKey = hotelStayKey(search);
  const occupancyKey = hotelOccupancyKey(search);
  const guestNationality = resolveNationality(nationality);
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
      nationality: guestNationality,
      filtersKey,
    }),
    queryFn: ({ signal }) => {
      const body = buildHotelRatesBody({
        search,
        filters: debouncedFilters,
        currency,
        nationality: guestNationality,
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
