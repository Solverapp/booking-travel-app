import { useQuery } from "@tanstack/react-query";
import { fetchHotelRatesWithFallback } from "../../services/hotelRatesService";
import {
  buildHotelRatesBody,
  hotelOccupancyKey,
  hotelStayKey,
} from "../../utils/queryParams";
import { queryKeys } from "../../utils/queryKeys";
import { resolveNationality } from "../../utils/nationality";

export const useHotelDetailRates = ({ hotelId, search, currency, nationality }) => {
  const stayKey = hotelStayKey(search);
  const occupancyKey = hotelOccupancyKey(search);
  const guestNationality = resolveNationality(nationality);

  return useQuery({
    queryKey: queryKeys.hotelRates(hotelId, {
      stayKey,
      occupancyKey,
      currency,
      nationality: guestNationality,
    }),
    queryFn: async ({ signal }) => {
      const body = buildHotelRatesBody({
        search,
        filters: {},
        currency,
        nationality: guestNationality,
        hotelIds: [hotelId],
      });
      const response = await fetchHotelRatesWithFallback(body, { signal });
      return {
        roomTypes: response.data?.data?.[0]?.roomTypes ?? [],
        effectiveCurrency: response.effectiveCurrency,
        raw: response.data,
      };
    },
    enabled: Boolean(hotelId && search.checkIn && search.checkOut),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    structuralSharing: false,
  });
};
