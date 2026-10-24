import { useCallback, useEffect, useRef, useState } from "react";
import { isValidCoords } from "./geo";

const CACHE_KEY = "bigkey.geo.v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

const readCache = () => {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - Number(parsed.savedAt) > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    if (!isValidCoords(parsed.coords)) return null;
    return {
      lat: Number(parsed.coords.lat),
      lng: Number(parsed.coords.lng),
    };
  } catch {
    return null;
  }
};

const writeCache = (coords) => {
  try {
    window.sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ coords, savedAt: Date.now() }),
    );
  } catch {
    return;
  }
};

const getBrowserStatus = () => {
  if (typeof window === "undefined") return "unavailable";
  if (!window.isSecureContext) return "unavailable";
  if (!window.navigator?.geolocation) return "unavailable";
  return null;
};

const useGeolocation = () => {
  const cached = readCache();
  const [coords, setCoords] = useState(cached);
  const [status, setStatus] = useState(cached ? "granted" : "idle");
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const deniedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const request = useCallback(async ({ force = false } = {}) => {
    if (inFlightRef.current) return null;

    const browserStatus = getBrowserStatus();
    if (browserStatus) {
      if (mountedRef.current) {
        setStatus(browserStatus);
        setError(null);
      }
      return null;
    }

    if (!force && deniedRef.current) return null;

    const freshCache = readCache();
    if (freshCache && !force) {
      if (mountedRef.current) {
        setCoords(freshCache);
        setStatus("granted");
        setError(null);
      }
      return freshCache;
    }

    inFlightRef.current = true;
    if (mountedRef.current) {
      setStatus("loading");
      setError(null);
    }

    return new Promise((resolve) => {
      window.navigator.geolocation.getCurrentPosition(
        (position) => {
          inFlightRef.current = false;
          const nextCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          writeCache(nextCoords);
          deniedRef.current = false;
          if (mountedRef.current) {
            setCoords(nextCoords);
            setStatus("granted");
            setError(null);
          }
          resolve(nextCoords);
        },
        (geoError) => {
          inFlightRef.current = false;
          const nextStatus = geoError?.code === 1 ? "denied" : "unavailable";
          if (nextStatus === "denied") deniedRef.current = true;
          if (mountedRef.current) {
            setStatus(nextStatus);
            setError(geoError?.message || "Location is unavailable");
          }
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 5 * 60 * 1000,
        },
      );
    });
  }, []);

  return { coords, status, error, request };
};

export default useGeolocation;
