import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hotelPrebookService } from "../../services/SupebasePrebookService";
import { hotelBookService } from "../../services/SupebaseBookService";
import { useAuth } from "../../context/AuthContext";
import { queryKeys } from "../../utils/queryKeys";

export const usePrebookHotel = () =>
  useMutation({
    mutationFn: (body) => hotelPrebookService.fetchPreBook(body),
  });

export const useBookHotel = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (body) => hotelBookService.fetchBook(body),
    onSuccess: () => {
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(user.uid) });
      }
    },
  });
};
