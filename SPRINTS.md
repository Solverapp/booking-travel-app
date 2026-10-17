# Спринты BigKey — модуль авиабилетов (Flights / LiteAPI)

Актуально на: 17.10.2026. Документ фиксирует, что сделано по спринтам, ключевые решения и как это проверять/продолжать.
Перед любой работой по вёрстке обязательно читать `ADAPTIVE.md` (правила адаптива проекта).
**Статус на 17.10:** профиль — пауза после редизайна (см. «Профиль»); выполнены Sprint 1–4 Flights (Sprint 4 — мультипассажиры children/infants), спринт «Полная meta отеля» (полные данные брони отеля в `bookings.meta` + детали в профиле) и «Валюта отеля = валюта профиля» (отображение цен на всех страницах отеля). Дальше — см. «Куда двигаться дальше».

---

## Стек и инфраструктура

- Frontend: React 19 + Vite 8, react-router 7, MUI icons, глобальные стили `src/styles/main.css` + `reset.css`.
- Backend: Supabase (auth + Postgres + Edge functions, Deno).
- Провайдер рейсов: LiteAPI Flights (sandbox). `currency` — из настроек профиля (`user_metadata.currency` → `localStorage`, fallback `AED`), `country: 'AE'` фиксирован.
- Edge functions:
  - `supabase/functions/liteapi-proxy` — прокси к LiteAPI (`x-target-url`, `x-service-type: flights`), `verify_jwt = false` (поиск работает без логина).
  - `supabase/functions/flights-booking` — серверная логика брони (`verify_jwt = true`), сама вставляет запись в `bookings` (Service=Flight) — клиентский `addBooking` не вызывать (будут дубли).
- БД (миграция `supabase/migrations/0001_flights.sql`):
  - `bookings` — общая таблица броней (как у отелей);
  - `flight_booking_sessions` — серверные сессии брони (`status`, `verified`, `secretKey`, `searchParams`, `expiresAt`);
  - `flight_bookings` — детали брони рейса;
  - `flight_airports` — локальный кэш автокомплита аэропортов.

## URL-контракт и роуты

- `/flights` — параметры (источник истины `src/utils/flightSearch.js`):
  `origin, destination, originLabel, destinationLabel, trip(oneway|round), depart, return, adults, children, infants, cabin(all|economy|business|first)`.
- `/flightpage/:sessionId` — форма пассажиров (статус сессии VERIFIED).
- `/flightcheckout/:sessionId` — оплата (статус PREBOOKED, Stripe через Payment SDK).
- `/flightconfirmation?sessionId=…` — подтверждение/ваучер (status CONFIRMED).
- Все три страницы под `ProtectedRoute`; после логина возвращает на исходный URL (`Login` → `location.state.from`).

## Жизненный цикл брони (edge: flights-booking)

`verify → PREBOOKED → BOOKING → CONFIRMED`

- `verify` (offerId + searchParams) → сессия VERIFIED; `verified.journey` + `verified.changes` (объект `{ cabinChanged, fareChanged, messages[], priceChanged, pricing:{old,new} }`, НЕ массив).
- `prebook` (sessionId + contact + passengers, `usePaymentSdk: true`) → secretKey для оплаты.
- `book` (sessionId + secretKey) — идемпотентный (повторный вызов → reused=true), PNR = bookingRef.
- `get` — состояние сессии для страниц.
- `passengers[]`: `title (MR|MS|MRS|MISS), firstName, lastName, birthday, gender (M|F), nationality, documentType: 'passport', documentNumber, documentIssueCountry, documentExpiry`. Placeholder-имена отклоняются (код 53099).
- Мультипассажиры (Sprint 4): клиент шлёт `passengerType` (0=adult, 1=child, 2=infant) по позиции (adults → children → infants); сервер (`flights-booking`) проверяет: длина `passengers` = adults+children+infants из `searchParams` сессии, `passengerType` совпадает с позицией, возраст на дату вылета (adult 12+, child 2–11, infant <2), `documentExpiry` не раньше даты вылета (источник — `searchParams.legs[0].date`). Ошибки — `BAD_REQUEST` с понятным сообщением.
- Payment SDK: `https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1`, config: `{ publicKey: 'sandbox', secretKey, returnUrl: origin + '/flightconfirmation?sessionId=…', targetElement: '#flight-payment-target', appearance:{theme:'flat'}, options:{ business:{ name: 'Solver Flights' } } }`.

---

## Хронология спринтов

### Sprint 1 — Поиск рейсов
- `FlightSearchForm.jsx`, `MobileFlightSearch.jsx`, `FlightDates.jsx`, `FlightGuests.jsx`, `AirportSearch.jsx`.
- Автокомплит аэропортов через `liteapi-proxy` + кэш в `flight_airports`.
- Сборка URL-параметров `/flights` (`src/utils/flightSearch.js`), переход с главной (`Search.jsx`).

### Sprint 2 — Результаты `/flights`
- `FlightsResult.jsx` + `FlightFilters.jsx` + `FilterDrawer` (переиспользован из отелей).
- Клиентские фильтры: цена, пересадки, авиакомпании, время вылета/прилёта, багаж, возвратность.
- Сортировки: Cheapest / Fastest / Earliest.
- Карточка рейса: вертикальный таймлайн (классы `.ftl-*`), раскрытие деталей по пересадкам, логотипы и названия перевозчиков.
- Страница `/flights` (`src/pages/flights.jsx`).

### Sprint 3 — Бронирование (flightpage → checkout → confirmation)
- `src/utils/flightJourneys.js` — общие хелперы journey (`journeyOffer, journeyPrice, durationMinutes, minutesBetween, dayOffset, legsOf, carriersOf, segmentFlightLabel`).
- `FlightDetails.jsx` — карточки Flight details / Passengers / Contact details, сайдбар-сводка, `prebook`, guard `loadedSessionRef` (форма не сбрасывается при обновлении user), предупреждения `changeNotices`, авторедиректы по статусу.
- `FlightCheckout.jsx` — Payment SDK, авторедиректы (VERIFIED → flightpage, CONFIRMED → confirmation, BOOKING → ожидание).
- `FlightConfirmation.jsx` — идемпотентный `book`, ваучер (PNR, сегменты, сумма, тревел-даты), retry.
- `ProtectedRoute.jsx` + `Login.jsx` — returnTo после авторизации.
- Роуты в `App.jsx`; страницы-обёртки `flightpage.jsx / flightcheckout.jsx / flightconfirmation.jsx`.

### Фиксы после ревью (скриншоты пользователя)
1. **Results: нет адаптива (adap_no.png)** — на ≤1200px блок результатов не растягивался (flex-start + fit-content → min-content 502px, выезд за экран). Фикс: `@media (max-width: 1200px) { .flights-results { width: 100%; } }` (`src/componets/flights/style.css`). Проверено CDP-эмуляцией 440px: `scrollWidth = 440`.
2. **Checkout: блоки слипались (check_desk.png)** — добавлен класс `.fcheckout-panel` (на `FlightDetails.jsx` и `FlightCheckout.jsx`): flex-column, gap 20px (14px ≤640), сброс margin у `.back-nav-btn` / `.page-main-title`.
3. **Оплата: виден тёмный фон вокруг виджета (paym_page.png)** — класс `.flight-payment-box` на `#flight-payment-target` + `.payment-gateway-wrapper .flight-payment-box { background: #ffffff; }`.
4. **Total duration пустой** — фолбэк в `FlightDetails.jsx`: `formatDuration(journey?.totalDuration) || formatDuration(minutesBetween(first.departure, last.arrival))`.
5. **`checkout-main-content` не на всю ширину** — родитель `.hconteiner` центрирует (`align-items: center`), main сжимался по контенту. Фикс: `width: 100%` в `.checkout-main-content, .confirmation-main-content` (`src/styles/main.css`; влияет и на чекаут отелей — это и было задумано как общий фикс).

### Sprint 4 — Мультипассажиры (adult + child + infant)
- `FlightDetails.jsx`: `passengerTypeOf(index, counts)` → `passengerType` (0/1/2) в payload; у каждой карты хинт возраста (`PASSENGER_RULES`: 12+ / 2–11 / Under 2, класс `.fpax-card-hint`); DOB-инпуты с `min`/`max` (границы от даты вылета: `birthdayBounds`), `documentExpiry` с `min` = дата вылета; клиентская валидация до `prebook` (`validatePassengers`, возраст на дату вылета + срок паспорта) с сообщением в error-banner.
- `flights-booking/index.ts`: нормализация/валидация пассажиров (см. «Жизненный цикл брони») — `AGE_RULES`, `parseDay`, `ageOn`; в LiteAPI и в БД уходит `normalizedPassengers` (старые клиенты без `passengerType` поддерживаются — тип выводится из позиции).
- LiteAPI `/flights/prebooks`: request-поле именно `passengerType` (integer 0/1/2); `type` (ADT/CHD/INF) — только в ответах. Официальное правило: длина `passengers` = adults+children+infants из поиска.
- Smoke: multi-pax flow (search 1+1+1 → verify → 3 негативных prebook (count/type/DOB) → prebook → book → `meta.passengers=3`) + `verifyFirstAvailable` (sandbox-офферы бывают sold out — перебор до 12 офферов).

### Пост-фиксы Sprint 4 (17.10, скриншоты пользователя)
1. **Sold out (LiteAPI 52010) в момент prebook** — инвентарь рейсов real-time: оффер может продаться между verify и prebook/book (в sandbox особенно). Сервер маппит 52010 / «sold out» в стабильный `OFFER_SOLD_OUT` (verify / prebook / reverify / book) с дружелюбным сообщением; клиент: `FlightsResult` — «pick another offer», `FlightDetails` — отдельный баннер, `FlightConfirmation` — убирает бесполезную «Try again», оставляет «Search another flight». Заранее гарантировать нельзя — verify ловит до оплаты, но гонка остаётся на стороне провайдера.
2. **Duplicate key `SAN` в консоли** — LiteAPI-автокомплит аэропортов отдаёт дубли IATA («San Diego - All Airports» + «San Diego International Airport» = оба SAN; также SJO). Ключ списка в `AirportSearch.jsx` → `` `${airport.iata}-${index}` ``.
3. **RouteTitle «EVN → EVN» у round-trip** — заголовок брался от первого до последнего сегмента всего journey (последний = прилёт обратного рейса). Теперь по outbound-ноге (`legs[0]`): `FlightDetails.jsx`, `FlightCheckout.jsx` → «EVN → LIS». Проверено CDP: `EVN → LIS`, 0 ошибок консоли, дублей-ключей 0.

### Спринт «Полная meta отеля» (17.10)

Цель: при бронировании отеля сохранять в `bookings.meta` максимум данных (отель, номер, питание, возврат с дедлайном, цена-разбивка, налоги, гости) и показывать их в деталях брони профиля.

- Цепочка: `Roomsnew.jsx addCheckout(offerId, roomName, ratePrice, rate, roomInfo)` → state `offerItem` → `Checkout.jsx` пишет расширенный `localStorage.hotelBookingMeta` → `Confirmation.jsx` (hotel) собирает полную `meta` и сохраняет через `addBooking` (reference = bookingId, currency = AED).
- Из `rate` берём: `rateId`, `boardName`, `cancellationPolicies.refundableTag` + `cancelPolicyInfos[0]` (deadline `cancelTime`, штраф `amount`, `currency`, `timezone`), `retailRate.total[0]` (цена), `retailRate.taxesAndFees` (разбивка налогов: `description/amount/currency/included`). Из `roomInfo`: `bedTypes[0].bedType`, `roomSizeSquare+Unit`, `maxAdults+maxChildren` (`maxGuests`). Из `hotel`: `id/name/main_photo/address/city/country/starRating/rating`.
- `meta` после брони: `{ hotel:{id,name,photo,address,city,country,stars,rating}, rooms:[{name,board,refundable,rateId,bedType,size,maxGuests,cancelPolicy:{deadline,amount,currency,timezone}|null}], checkin, checkout, nights, adults, children, holder, email, price:{total,perNight,currency}, taxes:[{description,amount,currency,included}] }`. Числа нормализуются (`toCount`, `perNight = total/nights`); старые брони без новых полей рендерятся как раньше.
- Детали брони (`BookingDetailsPopup.jsx`): Stay details расширены (Bed type, Room size, Nights, Address); бейдж возврата показывает дедлайн — «Free cancellation until 10 Nov, 23:00 GMT» (`formatPolicyDeadline` в `bookingUtils.jsx`, парсит «YYYY-MM-DD HH:mm:ss» как UTC + `timezone`); новый блок **Price details** (цена за ночь + налоги, невключённые — с пометкой «(payable at hotel)»).

### Валюта отеля = валюта профиля (17.10)

До этого цены отелей везде писались с хардкодом «AED», хотя запросы rates уже шли в валюте профиля (`getStoredCurrency()` + fallback AED). Теперь отображение берёт **фактическую валюту провайдера** (в `rates` ответе она приходит в `retailRate.total[0].currency` / `offerInitialPrice.currency`), с fallback на `getStoredCurrency()`:

- `HotelResult.jsx` — цена в карточке списка; `HotelPages.jsx` — «from X …» в шапке; `Roomsnew.jsx` — цена каждого тарифа (+ `rateCurrency`); `Checkout.jsx` — бейдж суммы, Subtotal, Total (`offer.priceInfo?.currency || getStoredCurrency()`); `Confirmation.jsx` — `currency` в `addBooking` = `hotelMeta.priceInfo.currency || getStoredCurrency()`, в ваучере — `displayCurrency` (state из той же meta), console.log с валютой.
- LiteAPI sandbox поддерживает **USD / EUR / GBP / AED** (проверено пробой `hotels/rates` для одного placeId: 474.61 USD / 422.26 EUR / 356.12 GBP / 1743.01 AED); при ошибке «currency» — автоповтор в AED (существующий `*WithCurrencyFallback`), и показ тогда корректно остаётся AED (фактическая валюта).
- Проверено CDP (реальный флоу): смена валюты в Settings тестового аккаунта на USD → результаты «267 USD», шапка отеля «from 266.89 USD», тарифы номеров «266.90 USD», 0 ошибок консоли; скриншоты `29-hotels-usd-results-1440`, `30-hotel-usd-page-1440`; валюта тест-аккаунта возвращена на AED.

---

## Проверка и тестирование

- E2E smoke (реальный sandbox, маршрут LON → PAR):
  `node --env-file=.env scripts/flights-smoke.mjs`
  Шаги: auth → airports → search → verify → get (формы данных страниц) → prebook → book (+ строка в `bookings`) → **multi-pax flow** (1 взрослый + 1 ребёнок + 1 младенец: verify, негативные prebook — count/type/DOB → `BAD_REQUEST`, корректный prebook → book → `meta.passengers=3`). Ожидание: `ALL STEPS PASSED`.
  Для негативных проверок и e2e-валидации функция `flights-booking` должна быть **задеплоена** (`npx supabase functions deploy flights-booking`, проект слинкован `segzcvdtkevkehvhssgs`).
- Тестовый аккаунт: `FLIGHTS_TEST_EMAIL` / `FLIGHTS_TEST_PASSWORD` в `.env`.
- Сборка: `npm run build`. Лint: `npm run lint` — **baseline 79 problems (68 errors / 11 warnings), не увеличивать**.
- Адаптив-проверка без реального телефона (CLI headless клампит окно до ~500px, поэтому только CDP):
  1) `chrome --headless=new --remote-debugging-port=9222 --user-data-dir=<temp>`;
  2) по WebSocket: `Emulation.setDeviceMetricsOverride { width: 440, height, deviceScaleFactor: 2, mobile: true }`;
  3) диагностика переполнения: элементы, у кого `getBoundingClientRect().right > document.documentElement.clientWidth`;
  4) `Page.captureScreenshot` для визуальной проверки.
  Так же можно проверять 768 / 1280 / 1440.
- Страницы брони требуют логина: для проверки — логин через форму (`input[type=email]` / `input[type=password]` + native setter + input event, затем submit), сессии для `/flightpage` (VERIFIED) и `/flightcheckout` (PREBOOKED) получаются скриптом из smoke-паттерна.
- Отельная meta (CDP, temp-скрипт `C:\Users\hovas\AppData\Local\Temp\opencode\hotel-meta-cdp.mjs`): логин → в `localStorage` кладутся `guestDetails` + `hotelBookingMeta` → `/confirmation?prebookId=…&transactionId=…` с **Response-стадией** мока `liteapi-proxy` (реальный upstream `rates/book` с фейковым prebookId отвечает 400 — тело переписывается на fake success; `Fetch.getRequestPostData` на Response-стадии тело не отдаёт, для гейтинга не использовать) → реальный INSERT в `bookings` → строка читается обратно через REST (`reference=eq.CDP-META-TEST-1`) → проверка блоков в профиле. Каждый прогон добавляет тестовую бронь «CDP Meta Hotel» (2 шт. за последний прогон — можно удалять вручную).

## Известные нюансы / ограничения

- Дата-инпуты в браузере с ru-локалью показывают плейсхолдер `дд.мм.гггг` — это локаль браузера, не баг.
- Sold out оффера — нормальное поведение real-time инвентаря (может прилететь на verify/prebook/book); в UI показываем `OFFER_SOLD_OUT` дружелюбно, но не «Try again» по тому же офферу.
- Автокомплит аэропортов LiteAPI возвращает дубли IATA (`SAN`, `SJO` — «All Airports» + конкретный) — уникализировать ключи списков.
- LiteAPI-форма `rate` (hotels/rates): `rateId`, `boardName`, `cancellationPolicies.refundableTag` (`RFN` = возвратный) + `cancelPolicyInfos[0]` (`cancelTime` «YYYY-MM-DD HH:mm:ss», штраф `amount`, `currency`, `timezone`), `retailRate.total[0]` (итог) и `retailRate.taxesAndFees[]` (`included` — включён ли налог в цену; невключённые платятся в отеле).
- `AuthContext` при восстановлении сессии перезаписывает `localStorage["bigkey.currency"]` из `user_metadata.currency` — в CDP-тестах валюту менять только через Settings UI (иначе перезапишется при auto-login).
- Sandbox-данные LiteAPI: перевозчики Nuitee Air / easyJet / flydubai / Emirates; цены в AED.
- `verified.journey` может не содержать `totalDuration` — всегда используем фолбэк.
- `verified.changes` — объект, рендер предупреждений — через `changeNotices()`.
- Классы `checkout-*`, `.form-card-ui`, `.digital-voucher-ticket` — глобальные (main.css), их переиспользуют и отели; менять осторожно, проверять `/hotels` чекаут.

## Карта файлов модуля

- Компоненты: `src/componets/flights/*` (`FlightsResult`, `FlightDetails`, `FlightCheckout`, `FlightConfirmation`, `FlightSearchForm`, `MobileFlightSearch`, `FlightFilters`, `AirportSearch`, `FlightDates`, `FlightGuests`, `style.css`).
- Страницы: `src/pages/flights.jsx`, `flightpage.jsx`, `flightcheckout.jsx`, `flightconfirmation.jsx`.
- Утилиты: `src/utils/flightSearch.js`, `src/utils/flightJourneys.js`, `src/utils/flightFormatters.js`, `src/utils/currency.js`.
- Сервис: `src/services/flights/flightBookingService.jsx`.
- Edge: `supabase/functions/flights-booking/index.ts`, `supabase/functions/liteapi-proxy/index.ts`, `supabase/config.toml`.
- Миграция: `supabase/migrations/0001_flights.sql`.
- Smoke: `scripts/flights-smoke.mjs`.

## Профиль (сессии 17.10, вне спринтов Flights) — ⏸ пауза, вернёмся позже

- Редизайн `/profile` (см. ADAPTIVE.md, шаг 7): сайдбар → ≤968 таб-бар, табы `?tab=overview|bookings|settings`.
- Bookings: фильтры по статусу/типу, карточки, детали — drawer (desktop) / `BottomSheet` (≤968); данные — `bookings` (`meta.segments` у рейсов, PNR = `reference`).
- Детали брони (17.10): отели сохраняют полные данные в `meta` (см. спринт «Полная meta отеля»): отель, номер, питание, возврат с дедлайном, цена-разбивка, налоги, гости; блоки **Stay details** + **Price details** + бейдж возврата; блок **Vouchers** у всех типов: ссылки из `meta.vouchers` (`[{title,url}]`), пока пусто — заглушка (наполнение из админ-панели в будущем).
- Выравнивание сайдбара: `.pcontainer` → `overflow-x: clip` (`overflow-x: hidden` делал контейнер scroll-портом и ломал sticky — паттерн 10 в ADAPTIVE.md).
- Settings: личные данные, смена пароля (re-auth текущим), валюта (AED/USD/EUR/GBP/RUB) — из неё берут валюту `buildRatesRequest` (flights) и отельные rates, с fallback AED при ошибке провайдера.
- После брони «Go to My Bookings» ведёт на `/profile?tab=bookings`.
- Затронуты общие файлы (важно и для отельного модуля): `AuthContext.addBooking(name, sum, Service, { reference, orderRef, meta, currency })`; `hotels/checkout/Checkout.jsx` пишет `localStorage.hotelBookingMeta`; `hotels/confirmation/Confirmation.jsx` сохраняет `meta` + `reference` = bookingId.

**Проверено (CDP + мок сети):** выравнивание `delta=0` на 1440; рендер Stay details/Vouchers на моке `meta` (Fetch.fulfillRequest); 1440/768/440 без overflow, 0 ошибок консоли; lint 79 = baseline, build OK.

**Осталось в профиле (вернуться позже):**
- Vouchers: UI готов — наполнить `meta.vouchers` из админ-панели, когда появится (формат `[{title, url}]`).
- Stay details появятся только у новых отельных броней (у старых записей `meta` пустая).
- Возврат: статус из `meta.rooms[].refundable` (RFN) + дедлайн из `meta.rooms[].cancelPolicy` (данные LiteAPI `cancellationPolicies.cancelPolicyInfos[0]` на момент брони).

## Куда двигаться дальше (идеи следующих спринтов)

- Отмена/возврат брони рейса (отображение брони рейса в профиле уже сделано — Bookings, `meta.segments`).
- Round-trip оформление (сейчас основной поток — one-way; параметр `trip` уже в URL).
- Локализация дат (убрать зависимость от локали браузера).
- `childrenAges`/`infantAges` в `/flights/rates` (опционально по докам LiteAPI) — точный возраст в поисковом запросе, когда появится возрастной визард.
- **Валюты — остатки хардкода AED** (аудит 17.10): туры — `tours/Tournew.jsx:144`, `tourpage/Tour.jsx:89`, `touroption/Optionew.jsx:302/334/369`, `tourbook/TourBook.jsx:122/125/134`; лейбл фильтра рейсов `flights/FlightFilters.jsx:60` («Price, AED» — брать валюту из search/session). Проверено пробой: LiteAPI отели поддерживают USD/EUR/GBP/AED; фолбэк на AED при неподдерживаемой валюте остаётся.
- Мёртвый Xano-сервис `services/hotelService.jsx` (хардкоды AED, никем не импортируется) — кандидат на удаление в следующей чистке.
