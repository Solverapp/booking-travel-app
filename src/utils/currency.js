export const DEFAULT_CURRENCY = "AED";

export const CURRENCIES = [
  { code: "AED", label: "UAE Dirham" },
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "RUB", label: "Russian Ruble" },
];

const STORAGE_KEY = "bigkey.currency";

export const normalizeCurrency = (code) =>
  CURRENCIES.some((item) => item.code === code) ? code : DEFAULT_CURRENCY;

export const getStoredCurrency = () => {
  try {
    return normalizeCurrency(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_CURRENCY;
  }
};

export const setStoredCurrency = (code) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, normalizeCurrency(code));
  } catch (err) {
    console.warn("Failed to persist currency preference", err);
  }
};

export const isCurrencyError = (err) =>
  /currency/i.test(String(err?.message ?? err ?? ""));
