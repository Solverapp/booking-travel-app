# HANDOFF — BigKey / Solver

Дата среза: **2026-10-26** (UTC).
Этот файл — краткая точка входа для продолжения работы. Исторические детали остаются в `SPRINTS.md`.

## Production

- Frontend: https://booking-travel-app.vercel.app
- Vercel project: `booking-travel-app` (`prj_nlhSaf6kVEdRqqduiTt3X2cC7ibq`)
- Supabase project ref: `segzcvdtkevkehvhssgs`
- `flights-booking`: **version 14, ACTIVE** (задеплоен 2026-10-24)
- `hotels-booking`: version 2, ACTIVE
- `liteapi-proxy`: version 10, ACTIVE
- `tours-booking`: **version 6, ACTIVE** (phase 1 + B2C rates + unique refs, задеплоен 2026-10-26)
- `tours-payment`: **version 3, ACTIVE** (phase 2 + payment fee, задеплоен 2026-10-26)
- `tours-stripe-webhook`: **version 2, ACTIVE** (phase 2, `verify_jwt=false`, задеплоен 2026-10-26)

Vercel env для Production/Preview содержит `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` и `VITE_STRIPE_PUBLISHABLE_KEY` (добавлен 2026-10-26).
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

### Tours checkout — phase 1 (2026-10-26)
- Добавлена миграция `supabase/migrations/0003_tours_pre_bookings.sql`: таблица `tours_pre_bookings`, sequence для `unique_no` / `service_unique_id` / `client_reference_no`, RLS (select своих), trigger `updated_at`, RPC `next_tour_booking_refs`.
- Добавлена edge function `supabase/functions/tours-booking/index.ts` (`prebook`, `get`), `verify_jwt = true`; создаёт только prebooking, Rayna `/booking` не вызывает.
- `prebook` заново получает `/touroption`, `/touroptionstaticdata` и `/timeslot`, проверяет option/transfer/slot, собирает `rayna_payload` с B2B-ценами из option (`adultRate`, `childRate`, `serviceTotal = finalAmount`).
- `tours_pre_bookings` хранит B2B/B2C snapshot, `client`, `rayna_payload`, `tour_snapshot`, Stripe-поля (пока не используются).
- Frontend: `TourBook` переписан в стиле flight checkout (prefix, имя/фамилия, email, country code + phone, nationality, pickup для sharing/private), добавлены `tourBookingService`, `useCreateTourPrebooking`, `utils/tourCheckout.js`.
- `Optionew` теперь сохраняет полный выбранный item (`transferName`, `startTime`, `slotId`, `slotTime`, `infant`, image/city, B2B/B2C rates) в `sessionStorage` + router state; `/toursbookpage` защищён `ProtectedRoute`.
- Исправлен матчинг `tour_discount_rates` по `tour_option_id` + `transfer_Id` и availability по option + transfer.
- Phase 1 заканчивается success-экраном с reference/status/total; страница оплаты Stripe — phase 2.

### Tours checkout — phase 2 (Stripe, 2026-10-26)
- Добавлена миграция `supabase/migrations/0004_tours_stripe_payments.sql`: `tours_payment_attempts`, индексы (`tpa_payment_intent_key`, `tpa_one_active_per_prebooking`, `tpb_stripe_payment_intent_key`), RLS, RPC `begin_tour_payment_attempt` и `finalize_tour_payment`.
- `begin_tour_payment_attempt` блокирует prebooking, проверяет owner/amount, переиспользует активный attempt, сбрасывает failed prebooking в `pending_payment/unpaid`.
- `finalize_tour_payment` идемпотентно ставит `payment_status='paid'`, `status='paid'`, `paid_at` и создаёт `bookings` (`Service='Tour'`, `status='Pending'`, `order_ref=prebooking.id`, `meta.tour_pre_booking_id`, `meta.payment_status='paid'`, nested `tour`/`contact`).
- `tours-payment` (v3): actions `createIntent` / `status` / `sync`, Stripe REST через `fetch` (без SDK), AED, `payment_method_types[0]=card`, idempotency key = attempt UUID; auth через Supabase JWT. `createIntent` отправляет в Stripe gross-сумму с комиссией и возвращает `paymentFee` / `paymentTotal` / `amounts`.
- `tours-stripe-webhook` (v2, `verify_jwt=false`): Web Crypto HMAC-проверка `Stripe-Signature`; события `payment_intent.succeeded/payment_failed/canceled/processing`, `charge.refunded`; full refund → `payment_status='refunded'`, `status='cancelled'`, booking `Cancelled`.
- Frontend: `tourPaymentService`, `useTourPaymentIntent` / `useTourPaymentStatus` / `useSyncTourPayment`, `TourPayment`, `TourConfirmation`, routes `/tourpayment/:prebookingId` и `/tourconfirmation`, `TourBook` редиректит на оплату, `TourSummary` вынесен в отдельный компонент.
- Установлены `@stripe/stripe-js ^10.1.0` и `@stripe/react-stripe-js ^7.0.0`.
- `STRIPE_SECRET_KEY` хранится в Supabase Edge Function secrets; `VITE_STRIPE_PUBLISHABLE_KEY` — в локальном `.env` и Vercel Production/Preview. `STRIPE_WEBHOOK_SECRET` добавлен в Supabase secrets 2026-10-26; unsigned POST в webhook теперь возвращает 400 `Invalid signature` (ранее 500 `Webhook is not configured.`).
- Миграция `supabase/migrations/0005_tour_payment_fee_and_refs.sql` (применена 2026-10-26): `payment_fee_b2c`, `payment_total_b2c`; gross-up формула Stripe UAE `ceil(((T + 1.05) / 0.95905) * 100) / 100` (3.9% + AED 1.00 + 5% VAT, округление вверх до филса); `finalize_tour_payment` проверяет gross и пишет `serviceTotal` / `paymentFee` / `paymentTotal` в `bookings.meta`; `bookings.sum` = gross; `tours_payment_attempts.amount` = gross в филсах.
- Payment UI: `TourSummary` показывает `Service total` / `Payment fee` / `Total to pay`; confirmation и `BookingDetailsPopup` показывают breakdown. Пример: `T=49` → fee `3.19`, total `52.19`; `T=211.60` → fee `10.13`, total `221.73`.
- Rayna refs: вместо трёх независимых sequence используется `tour_booking_ref_seq`; на каждую бронь выдаются 3 последовательных значения (`uniqueNo`, `serviceUniqueId`, `clientReferenceNo`), поэтому значения не повторяются ни внутри брони, ни между бронями. Проверено: `100001/100002/100003` и `100004/100005/100006`; старые sequence удалены.

### Backend
- `flights-booking` (version 14):
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
- `npm run lint` — **21 problem (19 errors / 2 warnings)**, все pre-existing; новые tour-файлы чистые. Baseline улучшен с 36 (удалён старый код `TourBook`).
- Production frontend smoke:
  - `/`, `/hotels`, `/flights`, `/tours`, `/login` → 200, React рендерится, splash исчезает, 0 overflow.
  - Login тестовым аккаунтом → `/profile`, session в localStorage.
  - `/profile?tab=bookings` → 19 карточек, 0 overflow.
  - `/flightconfirmation?sessionId=fbe729f5-...` → `Booking Confirmed!`, PNR `IPTVYC`, 0 overflow, 0 console errors.
- Backend E2E `node --env-file=.env scripts/flights-smoke.mjs` — **ALL STEPS PASSED**:
  - one-way: search → verify → prebook → book → repeat book (idempotent) → bookings row;
  - multi-pax: adult + child + infant, негативные проверки count/type/DOB, успешный book, `meta.passengers=3`, `meta.passengerList=3`.
- E2E создал 2 sandbox-брони в тестовом аккаунте `t@mail.com`; tour E2E добавил тестовые брони в основной аккаунт `hovass81@gmail.com` (в его профиле 13 броней: 6 Flight, 5 Hotel, 2 Tour).
- Tours phase 1 backend smoke (2026-10-26): `tours-booking` `get` с несуществующим id → 404 `NOT_FOUND`; `prebook` для Dubai Frame (tour `5066`, option `1569408`, transfer `41865`, 1 adult, `2026-11-05`) → 200, reference `100000`, total `AED 49`, payload с `adultRate=46`, `serviceTotal=46`, `timeSlotId="0"`, `startTime="08:00:00"`; `get` по созданному id → 200. Тестовая строка удалена, sequence сброшены на `100000`.
- Tours phase 2 build/lint (2026-10-26): `npm run build` — OK; `npm run lint` — 21 problem (19 errors / 2 warnings), новых ошибок в tour payment/confirmation файлах нет.
- Tours phase 2 backend smoke (2026-10-26): `tours-payment` без auth → 401 `UNAUTHORIZED_NO_AUTH_HEADER`; с auth и несуществующим prebooking → 404 `NOT_FOUND`; `tours-stripe-webhook` до настройки secret → 500 `Webhook is not configured.`, после настройки unsigned POST → 400 `Invalid signature.`
- Tours payment fee smoke (2026-10-26): migration `0005` применена; `createIntent` для Dubai Frame `T=49` → `paymentFee=3.19`, `paymentTotal=52.19`, `attempt.amount=5219`; `finalize_tour_payment` с `5219` → booking `sum=52.19`, `meta.serviceTotal=49`, `meta.paymentFee=3.19`, `meta.paymentTotal=52.19` (транзакция откатана).
- Rayna refs smoke (2026-10-26): две prebooking → `100001/100002/100003` и `100004/100005/100006`; значения в `rayna_payload` совпадают с колонками; тестовые строки удалены.
- Tours phase 2 E2E оплаты (2026-10-26): успешная тестовая оплата через `/tourpayment`. Prebooking `e218361d-ddf6-443b-815f-39d9af95324f` → `paid`, PaymentIntent `pi_3UUpPSJ2bCnanDte0DLpivhp`, attempt `succeeded`, `AED 211.60`; создана booking `32e45245-30b7-4a7a-92ac-cb8233d7df43` (`Service='Tour'`, `status='Pending'`, `meta.payment_status='paid'`, `meta.tour_pre_booking_id`). На момент оплаты webhook secret отсутствовал, поэтому финализация прошла через `sync` на confirmation page. Secret добавлен позже; Stripe Dashboard test event → 200.
- Tours fee-aware E2E (2026-10-26): prebooking `ee2387d6-1b19-4b5e-bf13-c83c29f2fc7d` → `paid`; service `211.60`, fee `10.13`, total `221.73`; attempt `2c7b8212-4bd5-4dc7-8850-771633fb888b` amount `22173`, `succeeded`; PI `pi_3UUqE5J2bCnanDte1Avtj7Sm`; booking `f3473b4f-03c5-4ef7-9e06-53684959449e` `sum=221.73`, `meta.serviceTotal=211.6`, `meta.paymentFee=10.13`, `meta.paymentTotal=221.73`; refs `100010/100011/100012`. Пользователь подтвердил правильную комиссию на Stripe.
- В профиле основного аккаунта `hovass81@gmail.com` (`user_id=974550e3-3c23-46e2-83e6-ae40a686dd0f`) 2 тестовые tour-брони (всего 13 броней: 6 Flight, 5 Hotel, 2 Tour). Первая создана до fee/refs-миграции: `sum=211.60`, без `paymentFee` в meta, refs `100000/100000/100000` — legacy. Вторая создана после миграции: `sum=221.73`, fee `10.13`, refs `100010/100011/100012`. Тестовый аккаунт `t@mail.com` (`d4f2223d-0664-4d86-9be8-dc9a3b5fa7dd`) использовался только для smoke.
- Vercel Production/Preview: `VITE_STRIPE_PUBLISHABLE_KEY` добавлен (2026-10-26).
- Production deploy (2026-10-26): `https://booking-travel-app.vercel.app` → 200; `/tourpayment/:id` и `/tourconfirmation` отдают SPA index (200); собранный JS содержит Stripe publishable key и `Payment fee`. Webhook: unsigned POST → 400, Dashboard test event → 200; fee-aware оплата проведена (см. выше).
- Loader fix (2026-10-26): `Loader`/`PageLoader` принимают `loaderColor`; на `/tourpayment` и `/tourconfirmation` спиннер и текст белые на зелёном фоне. Build/deploy OK.
- Tour option fix (2026-10-26): лоадер в `Optionew` держится до завершения первичной проверки availability и выбора transfer; убран flash `Not found` перед появлением опций. Build/deploy OK.

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

### 0. Tours checkout — phase 2 (Stripe)
- [x] Отдельная страница оплаты `/tourpayment/:prebookingId` и отдельный сервис `tours-payment`.
- [x] Stripe Payment Element / PaymentIntent в AED (fils), только card, без Apple/Google Pay/Link и Stripe receipts.
- [x] Webhook: `payment_status='paid'`, `status='paid'`, `paid_at`, зеркало в `bookings` со `status='Pending'`, `meta.payment_status='paid'`, `meta.tour_pre_booking_id`.
- [x] Confirmation page с `sync` + polling статуса; fallback, если webhook задерживается.
- [x] Провести тестовую оплату картой: `sync` на confirmation page финализировал prebooking, `bookings` создан со `status='Pending'`, confirmation page показывает `Payment received`.
- [x] Создать Stripe webhook endpoint `https://segzcvdtkevkehvhssgs.supabase.co/functions/v1/tours-stripe-webhook` с событиями `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `payment_intent.processing`, `charge.refunded`; добавить `STRIPE_WEBHOOK_SECRET` в Supabase secrets. Unsigned POST → 400, Dashboard test event → 200.
- [x] Добавить gross-up комиссию Stripe UAE и показывать `Service total` / `Payment fee` / `Total to pay` на оплате, confirmation и в деталях брони.
- [x] Сделать `uniqueNo`, `serviceUniqueId`, `clientReferenceNo` уникальными и не повторяющимися.
- [x] Провести новую тестовую оплату уже с комиссией: Stripe amount = `paymentTotal`, `bookings.sum` = gross, breakdown сохранён в `meta` (проверено 2026-10-26).
- [x] Исправить цвет лоадера на зелёном фоне `/tourpayment` и `/tourconfirmation`.
- [x] Убрать flash `Not found` в tour options до завершения загрузки/availability.
- [ ] После оплаты — admin flow для ручного бронирования через Rayna с использованием сохранённого `rayna_payload`.
- [ ] Проверить `tour_snapshot`/payload на нескольких типах трансферов и slot-опциях.

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
npx supabase functions deploy tours-booking --project-ref segzcvdtkevkehvhssgs
npx supabase functions deploy tours-payment --project-ref segzcvdtkevkehvhssgs
npx supabase functions deploy tours-stripe-webhook --no-verify-jwt --project-ref segzcvdtkevkehvhssgs

# apply pending migrations
npx supabase db push --linked --project-ref segzcvdtkevkehvhssgs --yes

# deploy frontend (VITE_STRIPE_PUBLISHABLE_KEY already set in Vercel)
npx vercel deploy --prod --yes --logs

# SQL к production (через CLI-сессию)
npx supabase db query --linked --project-ref segzcvdtkevkehvhssgs --output json "select ..."
```

## Ограничения окружения
- `git` и `rg` не в PATH; `.git` существует, но коммиты в этой сессии не делались.
- `deno` нет в PATH — использовать `npx --yes deno ...`.
- Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Supabase free plan: Edge Functions ~150s wall clock; новые таймауты снижают риск зависания, но не гарантируют ответ LiteAPI быстрее лимита.
