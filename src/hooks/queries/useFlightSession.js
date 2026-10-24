import { useQuery } from "@tanstack/react-query";
import { flightsBookingService } from "../../services/flights/flightBookingService";
import { useAuth } from "../../context/AuthContext";
import { queryKeys } from "../../utils/queryKeys";

const servicesOf = (session) => {
  const groups =
    session?.servicesAttachable?.groups ??
    session?.verified?.servicesAttachable?.groups ??
    [];
  return groups.flatMap((group) => (Array.isArray(group?.services) ? group.services : []));
};

export const useFlightSession = (sessionId) => {
  const { user } = useAuth();
  const userId = user?.uid;

  return useQuery({
    queryKey: queryKeys.flightSession(userId, sessionId),
    queryFn: async ({ signal }) => {
      const data = await flightsBookingService.getFlightSession(sessionId, { signal });
      let session = data?.session ?? null;
      if (!session) throw new Error("Booking session not found");

      if (session.status === "PREBOOKED" && servicesOf(session).length === 0) {
        const refreshed = await flightsBookingService.getFlightSession(sessionId, {
          refreshServices: true,
          signal,
        });
        session = refreshed?.session ?? session;
      }

      return { session };
    },
    enabled: Boolean(userId && sessionId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
};
