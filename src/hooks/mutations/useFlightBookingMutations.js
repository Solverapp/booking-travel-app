import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flightsBookingService } from "../../services/flights/flightBookingService";
import { useAuth } from "../../context/AuthContext";
import { queryKeys } from "../../utils/queryKeys";

const patchSession = (queryClient, userId, sessionId, patch) => {
  if (!userId || !sessionId) return;
  const definedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
  queryClient.setQueryData(queryKeys.flightSession(userId, sessionId), (current) => {
    if (!current?.session) return current;
    return { session: { ...current.session, ...definedPatch } };
  });
};

export const useVerifyFlight = () =>
  useMutation({
    mutationFn: ({ offer, searchParams }) =>
      flightsBookingService.verifyFlight({ offerId: offer.offerId, searchParams }),
  });

export const usePrebookFlight = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params) => flightsBookingService.prebookFlight(params),
    onSuccess: (data, variables) => {
      patchSession(queryClient, user?.uid, variables.sessionId, {
        status: "PREBOOKED",
        prebookId: data?.prebookId ?? null,
        secretKey: data?.secretKey ?? null,
        verifiedPrice: data?.price,
        currency: data?.currency,
        priceBreakdown: data?.priceBreakdown ?? null,
        servicesAttachable: data?.servicesAttachable ?? null,
        selectedServices: data?.selectedServices ?? [],
        bookedServices: data?.bookedServices ?? [],
        contact: variables.contact,
        passengers: variables.passengers,
      });
    },
  });
};

export const useAttachFlightServices = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params) => flightsBookingService.attachFlightServices(params),
    onSuccess: (data, variables) => {
      patchSession(queryClient, user?.uid, variables.sessionId, {
        secretKey: data?.secretKey ?? undefined,
        verifiedPrice: data?.price,
        currency: data?.currency,
        priceBreakdown: data?.priceBreakdown ?? null,
        servicesAttachable: data?.servicesAttachable ?? null,
        selectedServices: data?.selectedServices ?? [],
        bookedServices: data?.bookedServices ?? [],
      });
    },
  });
};

export const useBookFlight = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ sessionId }) => flightsBookingService.bookFlight({ sessionId }),
    onSuccess: (_data, variables) => {
      if (user?.uid) {
        queryClient.removeQueries({
          queryKey: queryKeys.flightSession(user.uid, variables.sessionId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(user.uid) });
      }
    },
  });
};
