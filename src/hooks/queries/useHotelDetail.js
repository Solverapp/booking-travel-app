import { useQuery } from "@tanstack/react-query";
import { hotelIdService } from "../../services/SupebaseHotelIdService";
import { queryKeys } from "../../utils/queryKeys";

export const hotelDetailQueryOptions = (hotelId) => ({
  queryKey: queryKeys.hotelDetail(hotelId),
  queryFn: async ({ signal }) => {
    const response = await hotelIdService.fetchHotelDetalis({ id: hotelId }, { signal });
    return response?.data ?? null;
  },
  staleTime: 60 * 60_000,
});

export const useHotelDetail = (hotelId) =>
  useQuery({
    ...hotelDetailQueryOptions(hotelId),
    enabled: Boolean(hotelId),
  });
