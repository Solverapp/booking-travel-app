import { useQuery } from "@tanstack/react-query";
import { hotelService } from "../../services/SupebaseService";
import { queryKeys } from "../../utils/queryKeys";

export const useHotelChains = (placeId) =>
  useQuery({
    queryKey: queryKeys.hotelChains(placeId),
    queryFn: ({ signal }) => hotelService.fetchChainsForPlace(placeId, { signal }),
    enabled: Boolean(placeId),
    staleTime: 60 * 60_000,
  });
