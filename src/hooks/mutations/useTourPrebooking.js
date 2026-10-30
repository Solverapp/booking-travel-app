import { useMutation } from "@tanstack/react-query";
import { tourBookingService } from "../../services/tours/tourBookingService";

export const useCreateTourPrebooking = () =>
  useMutation({
    mutationFn: (params) => tourBookingService.createPrebooking(params),
  });
