# Спринты BigKey — модуль авиабилетов (Flights / LiteAPI)

Актуально на: 21.10.2026. Документ фиксирует, что сделано по спринтам, ключевые решения и как это проверять/продолжать.
Перед любой работой по вёрстке обязательно читать `ADAPTIVE.md` (правила адаптива проекта).
**Статус на 21.10:** профиль — пауза после редизайна (см. «Профиль»); выполнены Sprint 1–5 Flights (Sprint 4 — мультипассажиры children/infants), спринт «Полная meta отеля» (полные данные брони отеля в `bookings.meta` + детали в профиле), «Валюта отеля = валюта профиля», «Детали брони рейса в профиле» (пассажиры, контакт, пересадки/длительность в `meta` + рендер), «Round-trip оформление» (ваучер по направлениям, фикс reused-book, per-leg duration, dynamic currency фильтра), «UI отелей: карточки списка + мобильные правки» и **Sprint 5 — единый редизайн поиска Tour/Hotel/Flights** (мобильные stacked-блоки и шторки, популярные/ближайшие направления, desktop `AnchoredPopover` + Clear/Apply). Календари дат: desktop — 2 месяца у отеля без внутреннего скролла, mobile — 2 месяца stacked; LiteAPI-ключ убран из клиента. Build OK, lint 77 = baseline; CDP-smoke 390/1179 — без overflow и ошибок консоли. Дальше — см. «Куда двигаться дальше».

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

### Детали брони рейса в профиле (18.10)

Замечание пользователя: в личном кабинете мало данных о брони рейса — нужно показать пассажиров, пересадки и т.д. (паритет с полной meta отеля).

- Edge `flights-booking` `buildBookingSummary` — расширенная `meta` (берётся из сессии: prebook сохраняет `passengers`/`contact` в `flight_booking_sessions`):
  - `passengerList[]` — `{ type (0/1/2), title, firstName, lastName, birthday, gender, nationality, documentType, documentNumber, documentIssueCountry, documentExpiry }`;
  - `contact` — `{ firstName, lastName, email, phoneCountryCode, phoneNumber }`;
  - `adults / children / infants` (из `search_params`), `cabin`, `trip`; в сегментах — `carrierName` (полное название перевозчика).
- `BookingDetailsPopup.jsx`:
  - блок **Flight details** вместо Itinerary: на каждое направление — дата, times-route (вылет/прилёт, `<strong>` + код), длительность (`minutesBetween`), пересадки Badge «Direct / 1 stop / N stops», между сегментами — «Layover Xh Ym in CODE» (`bd-layover` между пунктирными линиями);
  - блок **Travelers** (только при `meta.passengerList`): карточка на пассажира — имя (title+first+last), бейдж Adult/Child/Infant (из `type`, фолбэк по позиции), DOB, пол, гражданство, паспорт (номер + страна выдачи), срок паспорта;
  - блок **Contact details** (только при `meta.contact`): имя, email, телефон (+code);
  - Booking info: строки **Trip type** (One way/Round trip — из `trip`, фолбэк по направлениям сегментов) и **Cabin** (Economy/Business/First/Any cabin);
  - Stay details теперь гейтится `isHotelStay` (rooms/checkin/nights) — у рейсов блок не показывается (иначе `meta.adults` рейса рисовал «Guests»);
  - хелперы в `bookingUtils.jsx`: `passengerTypeLabel`, `formatGender`, `cabinLabel`; стили `bd-leg-*`, `bd-segs`, `bd-layover`, `bd-pax-*` в `profile/style.css` (+ адаптив ≤640).
- Проверено: smoke (`ALL STEPS PASSED`, ассерты `meta.passengerList=3`, `meta.contact.email`) + CDP реального профиля (десктоп-дровер и мобильная шторка 440: блоки/данные на месте, 0 ошибок консоли, 0 overflow, без duplicate keys; скриншоты `31-profile-flight-details-1440`, `32-profile-flight-details-440`).
- Функция `flights-booking` **задеплоена** (новые поля появляются только у новых броней; старые рендерятся как раньше).

### Round-trip оформление (18.10)

Пункт из «Куда двигаться дальше». Поток оказался рабочим на бэке (search→verify→prebook→book round-trip проходит целиком, обе стороны OUTBOUND/INBOUND в `meta.segments`), но UI нигде толком не проверялся — были найдены и исправлены реальные баги.

- **Критичный баг (book idempotent)**: повторный вызов `book` по тому же `sessionId` (F5 на чекауте, возврат со Stripe-страницы, повторная отправка формы после сети) возвращал короткий ответ без `meta/total/tourName` → ваучер «0.00 AED» и пустая бронь. Теперь edge при повторе возвращает полный summary из строки `bookings` по `order_ref` (тот же формат, что и первый ответ). Задеплоено.
- `tourName` round-trip: `LHR ⇄ CDG` (знак ⇄, у one-way — `→`); применяется к новым броням.
- `FlightConfirmation.jsx`: сегменты группируются по направлениям — заголовки-группы OUTBOUND/RETURN (`.fvoucher-group`, `.fvoucher-group-label`); one-way — одна группа без лейбла.
- `FlightFilters.jsx`: лейбл «Price, AED» → «Price, {currency}» — фактическая валюта выдачи (`FlightsResult` вычисляет `resultCurrency` из офферов).
- `FlightCheckout.jsx`: лейбл «Route» → «Trip type» (One way / Round trip).
- `FlightDetails.jsx`: сайдбар «Total duration» для round-trip показывал **174h 21m** — `journey.totalDuration` у LiteAPI для round-trip = весь интервал, включая дни между вылетами. Теперь per-leg `minutesBetween` (`Duration: 2h 11m · 11m`); one-way — без изменений («Total duration»).
- Проверено CDP все 4 экрана round-trip (real flow, LHR⇄CDG, 409.38 AED): результаты (2 ноги в карточке, «Price, AED»), flightpage (OUTBOUND/RETURN, Duration per-leg, RouteTitle `LHR → CDG`), checkout («17 Nov — 24 Nov», Trip type: Round trip, платёжный виджет смонтирован), ваучер (обе ноги в группах, полная сумма), профиль (Outbound/Return, Round trip). 0 ошибок консоли, 0 overflow; скриншоты `33`–`36`. One-way/multi-pax smoke — `ALL STEPS PASSED`; lint 79 = baseline; build OK.
- Скрипты: `scripts/flights-roundtrip-flow.mjs` (E2E round-trip: search→verify→prebook→book + проверка обеих сторон), `scripts/flights-roundtrip-prebook.mjs` (готовит VERIFIED/PREBOOKED сессию для CDP-проверок страниц; `STOP_AFTER_VERIFY=1` — только verify).

### UI отелей: карточки списка + мобильные правки (18.10)

**Карточки списка `/hotels` (референсы пользователя rating.png / price_login.png):**

- Новый `src/utils/hotelRate.js`: `MEMBER_SAVE_PERCENT` (10), `ratingLabel` (Superb 9+/Excellent 8+/Very good 7+/Good 6+/Pleasant 5+), `ratingTone` (green ≥8 / amber 6–7.9 / red <6), `formatScore`, `formatNumber`, `boardLabel` (RO→No meals и т.д.), `mealsIncluded` (boardType RO = без питания), `cancellationLabel` (RFN → Free cancellation), `paymentLabel` (NUITEE_PAY → Pay online), `taxesAndFeesSummary` (только `included:false`), `ratePriceInfo` (total + suggested, suggested только если больше total).
- `HotelResult.jsx`: рейтинг-плашка на фото (`.hc-rating` + лента-закладка с баллом); футер гостя — «Sign in and save 10%» (клик → `/login` с `state.from`) + бейдж «Member Price», у авторизованных строка скрыта; карточка — строка тарифа (комната, условия с иконками, цена: зачёркнутый suggested → итог, «for N nights for M guests», «+ X taxes and fees» если есть невключённые). Стили `.hc-*` в `newhotels/style.css`.
- CDP 440/1440, гость/авторизован: 0 ошибок консоли; скриншоты `37`–`41` (в temp-каталоге).

**Мобильные правки (референсы hotel_mobile.png / filter_hotel_mobile.png / popular.png / room_new.png):**

- Список: блок «Sort by» скрыт ≤1200; вместо него ряд `[Filters][кнопка-иконка]` (`.mcontrols` в `HotelResult`, `display: contents` на десктопе; кнопка `.sort-toggle-btn` 48px с `SwapVertOutlined`); сортировка — `BottomSheet` (title «Sort by», `.sort-sheet-btn`, активная с галочкой), клик применяет и закрывает. `SORT_OPTIONS` вынесены в `sorting/sortOptions.js` (react-refresh: файл компонента не должен экспортить константы). Отступ до карточек — `.hotelbox-grid { margin-top: 12px }` ≤1200.
- Критичный фикс: `grid-template-columns: 1fr` раздувался min-content карточки (457px при 440) → **`minmax(0, 1fr)`** (см. ADAPTIVE.md, паттерн 11).
- Дравер фильтров: ширина `min(96vw, 460px)` (было 88vw/430), верхний паддинг 12px (было 36), звёзды ≤640 — 40px / радиус 12 / иконка 14 (было 52/15/20).
- Popular facilities: сортировка по популярности — `sort 1..26` из `src/mock/facilities.js` по `facilityId` (те, что есть у отеля, идут в порядке sort; остальные — в порядке API), top-10; мобильные чипы — grid 2×N с ellipsis (длинные названия обрезаются, список не растягивается).
- Карточка тарифа (`Roomsnew.jsx`): убраны svg-иконки меалов/кровати; строка питания всегда — при питании `Restaurant` + текст **зелёные** (`.is-meals`), при Room Only `MeetingRoom` (дверь/номер) + «Room Only» **серые** (`.is-off`); `KingBed` + bedType всегда (фолбэк «Standard bed»); `SmokeFree` + «Non-smoking room» при no-smoking в `roomAmenities`; Buy Now — full width только ≤640 (на десктопе компактная), фикс специфичности `.rates-item .addCard`. Проверено CDP 440: зелёный `rgb(21,53,52)` и на иконке, и на тексте; Room Only — `MeetingRoomIcon` серый (скриншот `69`).
- Проверено CDP: 440 (кнопки/шторка/применение сортировки — цены 1,119→8,335 первым, дравер 422px/паддинг 12/звёзды 40, чипы Free WiFi первым + «Breakfast available (surcha…», facts «Room Only» серый / «Breakfast Included» зелёный + King bed, Buy 358=ширина контента, 0 ошибок, 0 overflow; скриншоты `42d`–`46d`, после пост-фикса — `48`/`49`) и 1440 (`.sorting` виден и работает, `.mcontrols` contents, кнопка скрыта, Buy компактный 134px, 0 overflow; скриншот `47`).
- Пост-фикс (жалоба пользователя «на десктопе нет фото карточек»): `.grid-card-img-box { height: 100% }` при `.grid-card { height: auto }` схлопывался в 0 (процент против auto-родителя, stretch не спасает) — фото стали невидимыми именно на десктопе (на ≤640 боксу задан явный `height: 180px`). Убран `height: 100%` у бокса — проверено CDP 1440/440 (бокс 268×253, фото на месте, скриншот `50`) и build OK.
- Адаптив от 380 (запрос пользователя): CDP-свип 320–440 (`mobile: false`) на `/`, `/hotels`, `/hotelpage` — **0 overflow** на всех ширинах (docScrollWidth = clientWidth); интерактив на 380: шторка поиска с календарём/гостями, дравер фильтров, сорт-шторка, поп-ап Room details, `/checkout`, бургер-меню, профиль (логин) — чисто, 0 ошибок консоли. Жалоба «<440 всё ломается» на текущей сборке не воспроизводится — если повторится, нужен конкретный экран/скриншот.
- Lint: **78 problems (67 errors / 11 warnings)** — ниже прежнего baseline 79 (ушёл неиспользуемый `useState` в sorting). Build OK.

### Sprint 5 — редизайн поиска Tour / Hotel / Flights (21.10)

**Мобильный поиск (≤968, компоненты монтируются условно):**
- `MobileSearch` (Tour/Hotel) переведён на stacked-поля `.msb`: Tour — `Where to?` / `When` / `Guests`, Hotel — город / диапазон дат / гости; строки 48px, gap 8, radius 12, CTA 48px text-only. Саммари и чипы убраны; home — белые поля, results — рамка `--light_gray` + лёгкая тень, sticky-панель отключена (`.msearch--stacked.msearch--results`). Календарь отеля в шторке — два месяца подряд (`monthCount={2}`, stacked).
- Туры: 3 фиксированных направления (`TOUR_DESTINATIONS`: Dubai, Abu Dhabi, Singapore), дефолт Dubai, выбор сразу в шторке. Отели: город в шторке с popular/nearby/results и `Near me`, диапазон дат с clear, гости в отдельной шторке с Done.
- Flights: `MobileFlightSearch` — route-card From/To + swap, IATA trailing, range-даты `Depart`/`Return` (One way), пассажиры + cabin; шторки route (`BottomSheet variant="airport"`), dates (`FlightDates variant="sheet"`) и guests. Выбор From переключает на To и не закрывает шторку, выбор To закрывает.
- `AirportPickerSheet`: табы, поиск с prefill выбранного аэропорта, clear-X сбрасывает выбор, `Near you` (до 3 ближайших в радиусе 500 км), popular исключает nearby, результаты с `City · IATA` / страной; debounce 300 ms, min 2 символа, `AbortController` + requestId, dedupe по IATA; GPS запрашивается при открытии.
- `useGeolocation` (`bigkey.geo.v1`, TTL 30 мин, timeout 8 s) — только браузерный GPS + локальный mock, координаты на сервер не уходят. На desktop автопромпта нет — только кнопка `Near me`.
- `MobileSearchField` / `MobileDateRangeField` — общие поля шторок/stacked-блока; `formatShortDate(..., { weekday: true })` даёт `21 Oct, Wed`.

**Desktop:**
- `AirportSearch` — `AnchoredPopover preferredWidth={372}`, popular/nearby/results, `Near me`, те же debounce/abort/dedupe-правила; sheet-вариант удалён.
- `DatePickerH` / `DatePickerOne` / `FlightDates` — `AnchoredPopover` (отель 704 + два месяца, тур 348, авиа 420), `CalendarGrid variant="plain"`, footer **Clear/Apply**; Check-in/Check-out кликабельны, Return у Flights — только для round. `allowOverlap` не даёт календарю уйти во внутренний скролл, если попап целиком помещается во viewport. Применение дат — по Apply (mobile-шторки по-прежнему `onDone`).
- `QuestSelector` / `TourGuestSelector` / `FlightGuests` — `AnchoredPopover` 378 + `GuestsContent variant="anchored"`.
- `AnchoredPopover`: portal в body, z-index 3000, flip top/bottom + clamp + `maxHeight`, `allowOverlap` для дат (календарь может перекрыть якорь, но не получает скролл), outside click, Escape, возврат фокуса. Новых зависимостей нет.

**Данные/сервисы:**
- `src/mock/searchDestinations.js`: `DEFAULT_TOUR_CITY`, `TOUR_DESTINATIONS`, `POPULAR_HOTEL_DESTINATIONS`, `POPULAR_AIRPORTS`, `NEARBY_RADIUS_KM = 500`.
- `src/utils/geo.js` (`distanceKm`, `nearestItems`), `src/utils/useGeolocation.js`, `src/utils/dateFormat.js`.
- `placesService.fetchPlacesList` — LiteAPI `/data/places` через Supabase edge `liteapi-proxy`; `flightApiService.fetchAirportSuggestions` — `/data/flights/airports` через тот же прокси; оба принимают `signal`, abort не подменяется cache fallback. `VITE_LITE_API_KEY` удалён из `.env` — LiteAPI-ключ живёт только в edge function (`LITE_API_KEY`).

**Чистка:** удалены мёртвые mobile-стили `.mchip*` / `.msearch-btn` / `.msummary-btn` / `.bs-*` / `.msearch-hint`, `.fdate-popup`, `.airport-sheet*`, `.airport-swap-btn`, `.airport-input--sheet`; `field-common.css` больше не содержит `.msearch-btn`.

**Проверка:** `npm run build` OK; `npm run lint` — 77 = baseline, новых нет. URL-контракты `/hotels`, `/tours`, `/flights` не менялись. CDP-smoke: 390 — отель показывает два месяца stacked, выбор check-in → check-out между месяцами, city-поиск через edge; 1179×647 — отель 704px / 2 месяца, авиа 420px, у попапов `scrollHeight = clientHeight` (без внутреннего скролла), `docScrollWidth = clientWidth`, 0 ошибок консоли. Живой LiteAPI `/data/places` через `liteapi-proxy` вернул результаты (Paris). Осталось: скриншот-ревью и живая выдача LiteAPI (hotel-vs-city, placeIds, координаты аэропортов).

---

## Проверка и тестирование

- E2E smoke (реальный sandbox, маршрут LON → PAR):
  `node --env-file=.env scripts/flights-smoke.mjs`
  Шаги: auth → airports → search → verify → get (формы данных страниц) → prebook → book (+ строка в `bookings`) → **multi-pax flow** (1 взрослый + 1 ребёнок + 1 младенец: verify, негативные prebook — count/type/DOB → `BAD_REQUEST`, корректный prebook → book → `meta.passengers=3` + `meta.passengerList=3` + `meta.contact.email`). Ожидание: `ALL STEPS PASSED`.
  Для негативных проверок и e2e-валидации функция `flights-booking` должна быть **задеплоена** (`npx supabase functions deploy flights-booking`, проект слинкован `segzcvdtkevkehvhssgs`).
- Round-trip E2E: `node --env-file=.env scripts/flights-roundtrip-flow.mjs` — search (LON⇄PAR) → verify → prebook → book; проверяет обе стороны (OUTBOUND/INBOUND) в meta. Ожидание: `ALL STEPS PASSED`.
- Сессия для CDP-проверок страниц брони: `node --env-file=.env scripts/flights-roundtrip-prebook.mjs` (PREBOOKED) или с `STOP_AFTER_VERIFY=1` (VERIFIED) — печатает `SESSION_ID` для `/flightpage/:id` и `/flightcheckout/:id`.
- Тестовый аккаунт: `FLIGHTS_TEST_EMAIL` / `FLIGHTS_TEST_PASSWORD` в `.env`.
- Сборка: `npm run build`. Лint: `npm run lint` — **baseline 78 problems (67 errors / 11 warnings), не увеличивать**.
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
- `journey.totalDuration` у round-trip = весь интервал, **включая дни между туда и обратно** (LHR⇄CDG с разницей в неделю даёт «174h»). Для отображения считаем per-leg `minutesBetween` (см. «Round-trip оформление»).
- `verified.changes` — объект, рендер предупреждений — через `changeNotices()`.
- Классы `checkout-*`, `.form-card-ui`, `.digital-voucher-ticket` — глобальные (main.css), их переиспользуют и отели; менять осторожно, проверять `/hotels` чекаут.

## Карта файлов модуля

- Компоненты Flights: `src/componets/flights/*` (`FlightsResult`, `FlightDetails`, `FlightCheckout`, `FlightConfirmation`, `FlightSearchForm`, `MobileFlightSearch`, `AirportPickerSheet`, `FlightFilters`, `AirportSearch`, `FlightDates`, `FlightGuests`, `style.css`).
- Поиск (общий): `src/componets/searchfields/*` (`MobileSearch`, `MobileSearchField`, `MobileDateRangeField`, `AnchoredPopover`, `SuggestionItem`, `searchUi.css`, `mobileSearchBlock.css`), `src/componets/qureytour/` (`CityTour`, `Pleasenew`), `src/componets/bottomsheet/`, `src/componets/quest/GuestsContent.jsx`.
- Страницы: `src/pages/flights.jsx`, `flightpage.jsx`, `flightcheckout.jsx`, `flightconfirmation.jsx`.
- Утилиты: `src/utils/flightSearch.js`, `src/utils/flightJourneys.js`, `src/utils/flightFormatters.js`, `src/utils/currency.js`, `src/utils/geo.js`, `src/utils/useGeolocation.js`, `src/utils/dateFormat.js`.
- Моки: `src/mock/searchDestinations.js` (направления, аэропорты, `NEARBY_RADIUS_KM`).
- Сервисы: `src/services/flights/flightBookingService.jsx`, `src/services/flights/flightApiService.jsx`, `src/services/placesService.jsx`.
- Edge: `supabase/functions/flights-booking/index.ts`, `supabase/functions/liteapi-proxy/index.ts`, `supabase/config.toml`.
- Миграция: `supabase/migrations/0001_flights.sql`.
- Smoke: `scripts/flights-smoke.mjs`, `scripts/flights-roundtrip-flow.mjs`, `scripts/flights-roundtrip-prebook.mjs`.

## Профиль (сессии 17.10, вне спринтов Flights) — ⏸ пауза, вернёмся позже

- Редизайн `/profile` (см. ADAPTIVE.md, шаг 7): сайдбар → ≤968 таб-бар, табы `?tab=overview|bookings|settings`.
- Bookings: фильтры по статусу/типу, карточки, детали — drawer (desktop) / `BottomSheet` (≤968); данные — `bookings` (`meta.segments` у рейсов, PNR = `reference`).
- Детали брони (17.10): отели сохраняют полные данные в `meta` (см. спринт «Полная meta отеля»): отель, номер, питание, возврат с дедлайном, цена-разбивка, налоги, гости; блоки **Stay details** + **Price details** + бейдж возврата; блок **Vouchers** у всех типов: ссылки из `meta.vouchers` (`[{title,url}]`), пока пусто — заглушка (наполнение из админ-панели в будущем).
- Детали брони рейса (18.10): **Flight details** (дата/время, длительность, пересадки, layover-ы), **Travelers** (паспортные данные), **Contact details**, строки Trip type/Cabin — см. спринт «Детали брони рейса в профиле».
- Выравнивание сайдбара: `.pcontainer` → `overflow-x: clip` (`overflow-x: hidden` делал контейнер scroll-портом и ломал sticky — паттерн 10 в ADAPTIVE.md).
- Settings: личные данные, смена пароля (re-auth текущим), валюта (AED/USD/EUR/GBP/RUB) — из неё берут валюту `buildRatesRequest` (flights) и отельные rates, с fallback AED при ошибке провайдера.
- После брони «Go to My Bookings» ведёт на `/profile?tab=bookings`.
- Затронуты общие файлы (важно и для отельного модуля): `AuthContext.addBooking(name, sum, Service, { reference, orderRef, meta, currency })`; `hotels/checkout/Checkout.jsx` пишет `localStorage.hotelBookingMeta`; `hotels/confirmation/Confirmation.jsx` сохраняет `meta` + `reference` = bookingId.

**Проверено (CDP + мок сети):** выравнивание `delta=0` на 1440; рендер Stay details/Vouchers на моке `meta` (Fetch.fulfillRequest); 1440/768/440 без overflow, 0 ошибок консоли; lint 79 = baseline, build OK.

**Осталось в профиле (вернуться позже):**
- Vouchers: UI готов — наполнить `meta.vouchers` из админ-панели, когда появится (формат `[{title, url}]`).
- Stay details появятся только у новых отельных броней (у старых записей `meta` пустая).
- Travelers/Contact/Layover-детали — только у новых броней рейсов (старые показывают маршрут без пассажиров).
- Возврат: статус из `meta.rooms[].refundable` (RFN) + дедлайн из `meta.rooms[].cancelPolicy` (данные LiteAPI `cancellationPolicies.cancelPolicyInfos[0]` на момент брони).

## Куда двигаться дальше (идеи следующих спринтов)

- Отмена/возврат брони рейса (отображение брони рейса в профиле уже сделано — Bookings, `meta.segments`).
- Локализация дат (убрать зависимость от локали браузера).
- `childrenAges`/`infantAges` в `/flights/rates` (опционально по докам LiteAPI) — точный возраст в поисковом запросе, когда появится возрастной визард.
- **Валюты — остатки хардкода AED** (аудит 17.10): туры — `tours/Tournew.jsx:144`, `tourpage/Tour.jsx:89`, `touroption/Optionew.jsx:302/334/369`, `tourbook/TourBook.jsx:122/125/134`. Фильтр рейсов уже динамический (сделан в round-trip спринте). Туры — осознанное исключение (Rayna API только AED). Проверено пробой: LiteAPI отели поддерживают USD/EUR/GBP/AED; фолбэк на AED при неподдерживаемой валюте остаётся.
- Мёртвый Xano-сервис `services/hotelService.jsx` (хардкоды AED, никем не импортируется) — кандидат на удаление в следующей чистке.

### Flights: seats, baggage и полный price breakdown (20.10)

- Prebook теперь сохраняет `servicesAttachable` в `flight_booking_sessions.journey`; новый action edge-функции `attachServices` валидирует услуги, вызывает LiteAPI `/flights/prebooks/{prebookId}/services`, обновляет `transaction_id`/`secret_key`/`verified_price` и сохраняет `selectedServices` + `bookedServices` + `priceBreakdown`. Пустой `selectedServices: []` очищает допы (проверено).
- Добавлена страница `/flightseats/:sessionId` (Step 2 of 3): baggages по пассажирам (включённая норма + платные опции), seat map по сегментам и пассажирам, восстановление ранее выбранных мест/сумок, preview цены, кнопка продолжает в checkout. Seat passengers = adults + children; infants без места.
- Price breakdown (Tickets / Taxes, fees & charges / Service fee / Seats / Baggage / Total) выводится в details, seats, checkout, confirmation и profile. База и налоги считаются из `perPassenger`, seats/baggage — из `booking.pricing`.
- Baggage в fares/details/amenities показывает personal/carry-on/checked, вес и размеры; платные опции помечены `PAID` и не попадают в бесплатные amenities.
- В `bookings.meta` сохраняются `services`, `seats`, `baggage.included`, `baggage.purchased`, `priceBreakdown`, `fareFamily`; в `slimSegments` добавлен `segmentKey`. В profile добавлен блок **Seats & baggage**, строки цены рейса и метки Outbound/Return.
- Edge `flights-booking` задеплоен 20.10 (`segzcvdtkevkehvhssgs`). Проверки: `deno check` OK, `npm run build` OK, lint 78 = baseline. Sandbox E2E: prebook → attach seat + 2 bags → book, total 873.01 AED, услуги и разбивка сохранились; CDP 1440/440 без overflow. Скриншоты: `71`–`79` в temp/shots.
- Допустимое расхождение preview и финальной суммы — 0.01–0.02 AED из-за округления LiteAPI при конвертации; checkout показывает авторитетную сумму после attach.
