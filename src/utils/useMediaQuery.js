import { useMemo, useSyncExternalStore } from "react";

/* CSS-медиазапрос из JS. Рендер честный сразу на клиенте:
   getSnapshot читает matchMedia, getServerSnapshot отдаёт false. */
const subscribe = (query) => (callback) => {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};

const useMediaQuery = (query) => {
  const onSubscribe = useMemo(() => subscribe(query), [query]);

  return useSyncExternalStore(
    onSubscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
};

export default useMediaQuery;
