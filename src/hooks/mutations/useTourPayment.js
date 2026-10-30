import { useMutation } from "@tanstack/react-query";
import { tourPaymentService } from "../../services/tours/tourPaymentService";

export const useSyncTourPayment = () =>
  useMutation({
    mutationFn: (prebookingId) => tourPaymentService.sync(prebookingId),
  });
