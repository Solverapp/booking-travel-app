import { useQuery } from "@tanstack/react-query";
import { reviewsService } from "../../services/SupebaseReviewsService";
import { queryKeys } from "../../utils/queryKeys";

export const useHotelReviews = (hotelId, limit = 200) =>
  useQuery({
    queryKey: queryKeys.hotelReviews(hotelId, limit),
    queryFn: ({ signal }) => reviewsService.fetchReviews({ id: hotelId, limit }, { signal }),
    enabled: Boolean(hotelId),
    staleTime: 30 * 60_000,
  });
