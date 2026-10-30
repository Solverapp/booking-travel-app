import {
  getCountryCode,
  getCountryName,
  isCountryCode,
} from "./countries";

export const DEFAULT_NATIONALITY = "AE";

const STORAGE_KEY = "bigkey.nationality";

export const normalizeNationality = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return DEFAULT_NATIONALITY;

  const code = text.toUpperCase();
  if (isCountryCode(code)) return code;

  return getCountryCode(text) || DEFAULT_NATIONALITY;
};

export const nationalityName = (value) =>
  getCountryName(normalizeNationality(value)) || "United Arab Emirates";

export const getStoredNationality = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return isCountryCode(stored) ? stored.toUpperCase() : null;
  } catch {
    return null;
  }
};

export const setStoredNationality = (value) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, normalizeNationality(value));
  } catch (err) {
    console.warn("Failed to persist nationality preference", err);
  }
};

export const detectBrowserNationality = () => {
  try {
    const locale =
      navigator.languages?.[0] || navigator.language || navigator.userLanguage || "";
    const region = new Intl.Locale(locale).region;
    return region && isCountryCode(region) ? region.toUpperCase() : null;
  } catch {
    return null;
  }
};

export const getDefaultNationality = () =>
  getStoredNationality() || detectBrowserNationality() || DEFAULT_NATIONALITY;

export const resolveNationality = (profileNationality) => {
  const profile = String(profileNationality ?? "").trim();
  if (profile) {
    const code = getCountryCode(profile) || (isCountryCode(profile) ? profile.toUpperCase() : "");
    if (code) return code;
  }
  return getDefaultNationality();
};
