// Форматтеры для Flights UI (Sprint 2+)

export const formatMinutes = (minutes) => {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return "";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

// duration: number (минуты) или { minutes } из API
export const formatDuration = (duration) => {
  if (duration == null) return "";
  if (typeof duration === "number") return formatMinutes(duration);
  return formatMinutes(duration?.minutes);
};

export const formatTimeHM = (isoDateTime) => {
  if (!isoDateTime) return "";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

export const formatDateShort = (isoDateTime) => {
  if (!isoDateTime) return "";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

// +1 / +2 при переходе на следующий день
export const dayChangeLabel = (dayChange) => {
  const value = Number(dayChange);
  return Number.isFinite(value) && value > 0 ? `+${value}` : "";
};

// Direct / 1 stop / N stops: пересадки (connections) + технические остановки сегментов
export const stopsLabel = (journey) => {
  const connections = journey?.connections?.length ?? 0;
  const technical = (journey?.segments ?? []).reduce(
    (acc, segment) => acc + (Number(segment?.stopCount) || 0),
    0
  );
  const total = connections + technical;
  if (total <= 0) return "Direct";
  return total === 1 ? "1 stop" : `${total} stops`;
};

export const layoverLabel = (connection) => {
  if (!connection) return "";
  const parts = [formatDuration(connection?.duration)];
  const airport = connection?.arrivalAirportCode || connection?.departureAirportCode;
  if (airport) parts.push(`in ${airport}`);
  if (connection?.changeAirport) parts.push("(airport change)");
  return parts.filter(Boolean).join(" ");
};

export const offerTotal = (offer) => {
  const display = offer?.pricing?.display;
  const total = Number(display?.total);
  if (!Number.isFinite(total)) return null;
  return {
    total,
    currency: display?.currency ?? "",
    base: Number(display?.base) || null,
    tax: Number(display?.tax) || null,
  };
};
