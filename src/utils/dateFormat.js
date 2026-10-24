const MONTH_FORMATTER = new Intl.DateTimeFormat("en-GB", { month: "short" });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-GB", { weekday: "short" });

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatShortDate = (value, { weekday = false } = {}) => {
  const date = toDate(value);
  if (!date) return "";
  const day = date.getDate();
  const month = MONTH_FORMATTER.format(date);
  const base = `${day} ${month}`;
  return weekday ? `${base}, ${WEEKDAY_FORMATTER.format(date)}` : base;
};

export const formatDateRange = (start, end, options) => {
  const from = formatShortDate(start, options);
  const to = formatShortDate(end, options);
  if (!from) return to;
  if (!to) return from;
  return `${from} – ${to}`;
};
