import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { queryKeys } from "../../utils/queryKeys";

export const useFavorites = () => {
  const { user, getFavorites } = useAuth();
  const userId = user?.uid;

  return useQuery({
    queryKey: queryKeys.favorites(userId),
    queryFn: () => getFavorites(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
};
