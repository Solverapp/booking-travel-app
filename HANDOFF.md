# HANDOFF — BigKey / Solver

Дата среза: **2026-10-24** (UTC).
Этот файл — краткая точка входа для продолжения работы. Исторические детали остаются в `SPRINTS.md`.

## Production

- Frontend: https://booking-travel-app.vercel.app
- Vercel project: `booking-travel-app` (`prj_nlhSaf6kVEdRqqduiTt3X2cC7ibq`)
- Supabase project ref: `segzcvdtkevkehvhssgs`
- `flights-booking`: **version 13, ACTIVE** (задеплоен 2026-10-24)
- `hotels-booking`: version 1, ACTIVE
- `liteapi-proxy`: version 9, ACTIVE

Vercel env для Production/Preview содержит `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
`.vercelignore` добавлен, чтобы не отправлять `.env*` в деплой. `.env.local` с OIDC-токеном после деплоя удалён.

## Что сделано в этой сессии

### TanStack Query / hotels / flights
- Добавлена инфраструктура TanStack Query: `src/utils/queryClient.js`, `queryKeys.js`, `apiError.js`, `queryParams.js`, `useDebouncedValue.js`.
- Отели, перелёты и профиль переведены на query/mutation hooks; прямые вызовы старых сервисов из этих компонентов убраны.
- Hotels: debounce фильтров, `keepPreviousData`, prefetch, error/empty states, skeleton при обновлении.
- Flights: session/booking flow, seats/baggage, derived state, idempotent retry, pending-состояния.
- `AuthContext`: `queryClient.clear()` на logout, сброс rates при смене валюты, стабильный идемпотентный `addBooking`.

### UI-фиксы
- В отелях вместо малозаметного `Updating…` — skeleton-карточки (`.hotel-skeleton*` в `newhotels/style.css`).
- Добавлен тёмный boot splash в `index.html` (`#boot-splash`).
- `AuthContext` показывает `BootLoader` вместо светлого `PageLoader` во время восстановления сессии.
- `FlightConfirmation` показывает тёмный loader вместо светлого `PageLoader`.
- `src/componets/loaders/BootLoader.jsx` + стили `.app-boot-loader` / `.app-boot-spinner`.

### Backend
- `flights-booking` (version 13):
  - таймауты LiteAPI: prebook 90s, attach 120s, book 120s;
  - stale `BOOKING` > 120s можно перехватить;
  - fresh `BOOKING` → `BOOKING_IN_PROGRESS`;
  - timeout/network/5xx → `BOOKING_UNKNOWN`;
  - LiteAPI `409/45035` → `BOOKING_IN_PROGRESS`;
  - терминальные 4xx сбрасывают сессию в `PREBOOKED`;
  - повторный `book` идемпотентен по `prebookId`/сессии.
- `hotels-booking` + `0002_hotel_booking_attempts.sql` — capability-подход, хеши, идемпотентность.

## Проверки

- `npm run build` — OK (есть предупреждение Vite про deprecated `optimizeDeps.esbuildOptions` и chunk > 500 kB).
- `npm run lint` — baseline **36 problems (33 errors / 3 warnings)**, все pre-existing. Мигрированные hotel/flight-файлы чистые; в `AuthContext` остаётся старый `react-refresh/only-export-components`.
- Production frontend smoke:
  - `/`, `/hotels`, `/flights`, `/tours`, `/login` → 200, React рендерится, splash исчезает, 0 overflow.
  - Login тестовым аккаунтом → `/profile`, session в localStorage.
  - `/profile?tab=bookings` → 19 карточек, 0 overflow.
  - `/flightconfirmation?sessionId=fbe729f5-...` → `Booking Confirmed!`, PNR `IPTVYC`, 0 overflow, 0 console errors.
- Backend E2E `node --env-file=.env scripts/flights-smoke.mjs` — **ALL STEPS PASSED**:
  - one-way: search → verify → prebook → book → repeat book (idempotent) → bookings row;
  - multi-pax: adult + child + infant, негативные проверки count/type/DOB, успешный book, `meta.passengers=3`, `meta.passengerList=3`.
- E2E создал 2 sandbox-брони в тестовом аккаунте `t@mail.com`; в профиле теперь 19 броней.

## Зависшая сессия (не исправлена автоматически)

- `session_id`: `bcd32576-3d77-4b0c-8863-9b021200ffe7`
- `user_id`: `974550e3-3c23-46e2-83e6-ae40a686dd0f`
- `order_ref`: `f5a65e94-294b-4ca4-a5fa-160c0d686383`
- `status`: `BOOKING`
- `created_at`: `2026-10-24T13:24:18Z`
- `updated_at`: `2026-10-24T13:29:02Z`
- `expires_at`: `2026-10-24T13:42:20Z` (истекла)
- В БД: `flight_bookings = 0`, `bookings = 0` по этому `order_ref`.

Сессия оставлена в `BOOKING`, чтобы не потерять возможную реальную бронь LiteAPI. Новый `flights-booking` сможет перехватить её как stale, но LiteAPI может ответить `OFFER_EXPIRED`. Если платёж был списан — нужна ручная сверка с LiteAPI/поддержкой, а не просто повторный `book`.

## Что осталось

### 1. Tours — основная миграция и доработка
Туры всё ещё не на TanStack Query:
- `src/componets/tours/Tournew.jsx` — `supabaseTourService.fetchToursByCity` через `useEffect`.
- `src/componets/touroption/Optionew.jsx` — `fetchTourOptions`, `fetchTourStatic`, `fetchTourAvailability`, `supabaseTourService.fetchDiscountRates`.
- `src/componets/slots/Slotsnew.jsx` — `fetchTourSlots`.
- `src/componets/qureytour/Pleasenew.jsx` — ручной debounce/`placesService` autocomplete.
- `src/services/raynaService.jsx` — сейчас через `liteapi-proxy` с `x-service-type: tours`, клиентского ключа нет.

Что сделать:
- вынести tours в `src/hooks/queries/` + `queryKeys` по образцу hotels/flights;
- убрать `useEffect`-загрузки, добавить `keepPreviousData`, abort/debounce, error/empty/retry states;
- проверить валюту: в турах местами жёстко зашит AED (`Tournew.jsx`, `Tour.jsx`, `Optionew.jsx`, `TourBook.jsx`);
- проверить даты/слоты/опции и корректность `searchParams` для tours;
- после миграции — production E2E туров.

### 2. Legacy / cleanup
- Мёртвые: `src/services/bubbleService.jsx`, `src/services/raynaService_old.jsx` (последний использует `VITE_RAYNA_API_KEY` и не импортируется).
- Re-export shims: `hotelApiService.jsx`, `hotelBookService.jsx`, `hotelPrebookService.jsx` — проверить и удалить, если не нужны.
- `services/hotelService.jsx` (Xano?) — проверить актуальность.

### 3. Качество
- Нет глобального error boundary и toast-системы.
- Нет автотестов/CI; E2E только скриптами.
- Bundle ~1.24 MB; code splitting не сделан.
- Lint baseline 36 — не ухудшать; постепенно чистить.

### 4. Безопасность
- Во время диагностики в локальный лог попал legacy `service_role` JWT (в файлы/репозиторий не записан).
- Перед публичным запуском рекомендуется ротировать legacy JWT secret / service_role key и убедиться, что Edge Functions используют актуальный `SUPABASE_SERVICE_ROLE_KEY`.
- Не коммитить `.env`, `.env.local`, `.vercel`, ключи и тестовые пароли.

## Полезные команды

```powershell
# build / lint
npm run build
npm run lint

# backend E2E (sandbox, создаёт брони)
node --env-file=.env scripts/flights-smoke.mjs
node --env-file=.env scripts/flights-roundtrip-flow.mjs

# deploy backend
npx supabase functions deploy flights-booking --project-ref segzcvdtkevkehvhssgs

# deploy frontend
npx vercel deploy --prod --yes --logs

# SQL к production (через CLI-сессию)
npx supabase db query --linked --project-ref segzcvdtkevkehvhssgs --output json "select ..."
```

## Ограничения окружения
- `git` и `rg` не в PATH; `.git` существует, но коммиты в этой сессии не делались.
- `deno` нет в PATH — использовать `npx --yes deno ...`.
- Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Supabase free plan: Edge Functions ~150s wall clock; новые таймауты снижают риск зависания, но не гарантируют ответ LiteAPI быстрее лимита.
