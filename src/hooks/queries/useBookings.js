import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { queryKeys } from "../../utils/queryKeys";

export const useBookings = () => {
  const { user, orders } = useAuth();
  const userId = user?.uid;

  return useQuery({
    queryKey: queryKeys.bookings(userId),
    queryFn: () => orders(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
};
