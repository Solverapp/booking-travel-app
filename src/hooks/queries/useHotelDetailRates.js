import { useQuery } from "@tanstack/react-query";
import { fetchHotelRatesWithFallback } from "../../services/hotelRatesService";
import {
  buildHotelRatesBody,
  hotelOccupancyKey,
  hotelStayKey,
} from "../../utils/queryParams";
import { queryKeys } from "../../utils/queryKeys";

export const useHotelDetailRates = ({ hotelId, search, currency }) => {
  const stayKey = hotelStayKey(search);
  const occupancyKey = hotelOccupancyKey(search);

  return useQuery({
    queryKey: queryKeys.hotelRates(hotelId, { stayKey, occupancyKey, currency }),
    queryFn: async ({ signal }) => {
      const body = buildHotelRatesBody({
        search,
        filters: {},
        currency,
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
