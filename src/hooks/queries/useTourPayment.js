import { useQuery } from "@tanstack/react-query";
import { tourPaymentService } from "../../services/tours/tourPaymentService";

export const useTourPaymentIntent = (prebookingId) =>
  useQuery({
    queryKey: ["tours", "payment", "intent", prebookingId],
    queryFn: () => tourPaymentService.createIntent(prebookingId),
    enabled: Boolean(prebookingId),
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useTourPaymentStatus = (prebookingId, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["tours", "payment", "status", prebookingId],
    queryFn: () => tourPaymentService.getStatus(prebookingId),
    enabled: Boolean(prebookingId) && enabled,
    refetchInterval: (query) => {
      const prebooking = query.state.data?.prebooking;
      if (!prebooking) return 2000;
      if (prebooking.paymentStatus === "paid" || prebooking.paymentStatus === "refunded") {
        return false;
      }
      if (prebooking.paymentStatus === "failed") return false;
      if (prebooking.status === "cancelled" || prebooking.status === "expired") {
        return false;
      }
      return 2000;
    },
  });
