import FlightTakeoffOutlined from "@mui/icons-material/FlightTakeoffOutlined";
import HotelOutlined from "@mui/icons-material/HotelOutlined";
import TourOutlined from "@mui/icons-material/TourOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import { formatTimeHM } from "../../utils/flightFormatters";

const STATUS_ALIASES = {
  confirmed: "confirmed",
  pending: "pending",
  cancelled: "cancelled",
  canceled: "cancelled",
  completed: "completed",
};

const SERVICE_META = {
  Flight: { label: "Flight", icon: FlightTakeoffOutlined, tint: "is-flight" },
  Hotel: { label: "Hotel", icon: HotelOutlined, tint: "is-hotel" },
  Tour: { label: "Tour", icon: TourOutlined, tint: "is-tour" },
};

export const serviceMeta = (service) =>
  SERVICE_META[service] ?? {
    label: service || "Booking",
    icon: ReceiptLongOutlined,
    tint: "is-other",
  };

export const normalizeStatus = (status) => {
  const value = String(status ?? "").trim().toLowerCase();
  return STATUS_ALIASES[value] ?? "other";
};

export const statusLabel = (status) => {
  const value = String(status ?? "").trim();
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const formatBookingDate = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatSegmentStamp = (isoDateTime) => {
  if (!isoDateTime) return "";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = formatTimeHM(isoDateTime);
  return time ? `${day}, ${time}` : day;
};

export const formatPolicyDeadline = (dateTime, timezone) => {
  if (!dateTime) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(dateTime));
  const date = match
    ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]))
    : new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${day}, ${time}${timezone ? ` ${timezone}` : ""}`;
};

export const formatMoney = (amount, currency) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  return `${value.toFixed(2)} ${currency || "AED"}`;
};

export const PASSENGER_TYPE_LABELS = ["Adult", "Child", "Infant"];

// Тип пассажира из meta.passengerList[].type (0/1/2); фолбэк — по позиции и counts
export const passengerTypeLabel = (passengerType, index, counts) => {
  const type = Number(passengerType);
  if (Number.isFinite(type) && PASSENGER_TYPE_LABELS[type]) {
    return PASSENGER_TYPE_LABELS[type];
  }
  const adults = Number(counts?.adults) || 0;
  const children = Number(counts?.children) || 0;
  if (adults || children || Number(counts?.infants)) {
    if (index < adults) return "Adult";
    if (index < adults + children) return "Child";
    return "Infant";
  }
  return "";
};

export const formatGender = (gender) => {
  const value = String(gender ?? "").trim().toUpperCase();
  if (value === "M") return "Male";
  if (value === "F") return "Female";
  return "";
};

const CABIN_LABELS = {
  economy: "Economy",
  premium_economy: "Premium economy",
  business: "Business",
  first: "First",
};

// "" для отсутствующего значения — строку не показываем
export const cabinLabel = (cabin) => {
  const value = String(cabin ?? "").trim().toLowerCase();
  if (!value) return "";
  if (value === "all") return "Any cabin";
  return CABIN_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
};
