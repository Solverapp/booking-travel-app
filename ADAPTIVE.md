# Инструкция: адаптивная версия BigKey

Цель — одна вёрстка, корректно работающая на 1920 → 360 px без горизонтального скролла.
Подход: **desktop-first** (базовые стили — десктоп, ниже — `@media (max-width: …)`), как уже написано в проекте.

---

## 0. Текущая диагностика

| # | Проблема | Где |
|---|---|---|
| 1 | `#root { width: 1900px }` — жёсткая ширина, главный блокер | `src/styles/main.css:56` |
| 2 | 27 из 31 CSS-файлов не содержат ни одного `@media` | `src/**/style.css` |
| 3 | Меню при `<1200px` просто исчезает (`display:none`), бургера нет | `src/componets/navbar/style.css:52` |
| 4 | Одинаковые классы `.nav-list-item`, `.nav-icons`, `.nav-list-item-end` объявлены в двух разных файлах — конфликт | `navbar/style.css:27` + `navbardark/style.css:31` |
| 5 | Фиксированные ширины контейнеров: `.hotel-box` 1259px, `.filter-box` 430px, `.cardnew` 400px, `.card` 313px | `newhotels`, `tours`, `tourbook`, `rooms`, `touroption` |
| 6 | Фикс. ширины элементов поиска: 372 / 248 / 236 / 235 / 206 px | `search/style.css`, `hotelsearch/style.css` |
| 7 | Календарь `grid-template-columns: repeat(7, 40px)` + попап `width:332px; left:-23px` | `datepicker/style.css:78,95,31` |
| 8 | Кнопка «поменять местами» позиционируется `position:absolute; left:47%` — ломается при переносе | `search/style.css:95` |
| 9 | Сайдбар профиля `position:fixed` + `:hover`-раскрытие — на тач-устройствах hover не срабатывает | `profile/style.css:103,116` |
| 10 | Паддинги страницы захардкожены `70px` | `newhotels:12`, `tours:12`, `hotelpage:10` |

### Правила (обязательны при всех правках)

1. **Никакой фиксированной ширины в px.** Только `width: 100%` + `max-width`. Ширину задавать через `max-width`, никогда через `width`.
2. **Все горизонтальные паддинги и gap — через CSS-переменные.** Не хардкодить `70px` в новых правилах.
3. **Один `@media`-блок в конце файла компонента**, сгруппированный по убыванию брейкпоинтов: `1440 → 1200 → 968 → 640`.
4. **Тап-цели ≥ 44×44 px**, поля ввода `font-size ≥ 16px` (иначе iOS Safari автозумит).
5. **`100dvh` вместо `100vh`** для элементов, попадающих под мобильный адресный браузер.

---

## 1. Токены и брейкпоинты

Добавить в `src/styles/main.css` внутрь `:root` (строки 6–39):

```css
:root {
  /* Брейкпоинты (только для справки — в @media не подставляются) */
  --bp-lg: 1440px;   /* десктоп-сокращение */
  --bp-md: 1200px;   /* планшет-альбом: включаем бургер, фильтры → drawer */
  --bp-sm: 968px;    /* планшет-портрет: колонки → 1 */
  --bp-xs: 640px;    /* телефон */

  /* Горизонтальные отступы страницы */
  --pad-page: 70px;        /* базово (десктоп) */
  --gap-grid: 16px;
  --radius-card: 30px;
}
```

Соответствующие переопределения — в разделе 2.

**Матрица изменений:**

| BP | Что включается |
|---|---|
| ≤1440 | `--pad-page: 32px`, `.hotel-box`/`.searchcontainer` → `width:100%`, типографика через `clamp()` |
| ≤1200 | **бургер-меню**, `.nav-list` скрывается, фильтры → выдвижная панель, `.hotel-grid` 2 → 1 колонка |
| ≤968 | `.checkout-layout-container` → 1 колонка, поиск → колонка, `.content-row` → колонка, календарь fluid, сайдбар профиля → таб-бар |
| ≤640 | карточки горизонтальные → вертикальные, кнопки `width:100%`, паддинги `16px`, `gap ×0.6` |

---

## 2. Глобальный каркас — `src/styles/main.css`

### 2.1 `#root` — снять жёсткую ширину (строка 56)

```css
#root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;            /* было: 1900px */
  max-width: 1900px;      /* сохраняем максимум десктопной раскладки */
  margin: 0 auto;
}
```

### 2.2 `.container` — высота (строки 66–78)

```css
.container {
  min-height: 100dvh;     /* было: 1000px */
}
```

### 2.3 `.section` (строки 79–89)

```css
.section {
  width: 100%;
  max-width: 984px;
  padding: 0 16px;        /* чтобы текст не прилипал к краям на телефоне */
}
```

### 2.4 Типографика (строки 115–132) — заменить блок целиком

```css
h1 {
  font-size: 32px;
  font-weight: 700;
  line-height: 40px;
}
h1.H1_big {
  font-size: clamp(36px, 6vw, 70px);
  font-weight: 700;
  line-height: 1.1;
}
```
Удалить существующий `@media (max-width: 1200px)` для `h1.H1_big` (строки 126–132) — `clamp()` его заменяет.

### 2.5 Токены отступов (см. раздел 1) — переопределить в медиа-запросах

Добавить **в самый конец** `main.css`:

```css
@media (max-width: 1440px) { :root { --pad-page: 32px; } }
@media (max-width: 1200px) { :root { --pad-page: 24px; } }
@media (max-width: 640px)  { :root { --pad-page: 16px; --gap-grid: 12px; } }
```

### 2.6 Checkout-форма

```css
/* было в .form-row-two-col (строка 206) — остаётся как есть */
.form-row-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

/* добавить в конец файла */
@media (max-width: 968px) {
  .form-row-two-col { grid-template-columns: 1fr; }
  .sticky-summary-card { position: static; top: auto; }
}
@media (max-width: 640px) {
  .checkout-main-content,
  .confirmation-main-content { padding: 24px 16px; }
  .form-card-ui { padding: 20px; }
  .page-main-title { font-size: 24px; margin-bottom: 20px; }
  .summary-hero-image { height: 140px; }
  .confirmation-action-buttons { flex-direction: column; gap: 12px; }
  .confirmation-layout-box { padding: 24px 16px; margin: 20px auto; }
  .form-row-two-col { gap: 14px; }
}
```

> `.checkout-layout-container` уже имеет `@media (max-width: 968px) → 1fr` (`main.css:153`) — не трогать.

---

## 3. Навбары и бургер-меню

### 3.1 Вынести общие классы

`.nav-list-item`, `.nav-list-item-end`, `.nav-icons`, `.nav-icons-flag` дублируются в `navbar/style.css:27–50` и `navbardark/style.css:31–51`. Создать **`src/styles/navbar-common.css`**:

```css
.nav-list-item,
.nav-list-item-end {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 4px 28px 4px 0;
}
.nav-list-item { border-right: solid 1px rgba(255, 255, 255, 0.3); }

.nav-icons { width: 32px; height: 32px; }
.nav-icons-flag { width: 32px; height: 23px; }

/* Бургер — общая кнопка для обоих навбаров */
.nav-burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 44px;
  height: 44px;
  padding: 10px;
  cursor: pointer;
  background: transparent;
}
.nav-burger span {
  display: block;
  width: 24px;
  height: 2px;
  border-radius: 2px;
  background: var(--white);
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.nav-burger.is-open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.nav-burger.is-open span:nth-child(2) { opacity: 0; }
.nav-burger.is-open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

@media (max-width: 1200px) {
  .nav-burger { display: flex; }
}
```

Импортировать его в **обоих** файлах навбаров:
```css
/* src/componets/navbar/style.css и src/componets/navbardark/style.css — первая строка */
@import '../../styles/navbar-common.css';
```
И удалить продублированные правила `.nav-list-item`, `.nav-list-item-end`, `.nav-icons`, `.nav-icons-flag` из обоих файлов.

### 3.2 Новый компонент `src/componets/mobilemenu/MobileMenu.jsx`

```jsx
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "./style.css";
import hotel from "../../img/icons/Navicons/building-4.svg";
import tours from "../../img/icons/Navicons/sun.svg";
import airline from "../../img/icons/Navicons/airplane.svg";
import profil from "../../img/icons/Navicons/profile-circle.svg";

const MobileMenu = ({ user }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onResize = () => window.innerWidth > 1200 && setOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <button
        className={`nav-burger ${open ? "is-open" : ""}`}
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span /><span /><span />
      </button>

      <div className={`mobile-overlay ${open ? "is-visible" : ""}`} onClick={() => setOpen(false)} />

      <nav className={`mobile-menu ${open ? "is-open" : ""}`}>
        <NavLink to="/hotels" onClick={() => setOpen(false)}>
          <img src={hotel} alt="" /><p>Hotels</p>
        </NavLink>
        <NavLink to="/tours" onClick={() => setOpen(false)}>
          <img src={tours} alt="" /><p>Tours</p>
        </NavLink>
        <NavLink to="#" onClick={() => setOpen(false)}>
          <img src={airline} alt="" /><p>Flights</p>
        </NavLink>
        <NavLink to={user ? "/profile" : "/login"} onClick={() => setOpen(false)}>
          <img src={profil} alt="" /><p>{user?.firstname || "Log in"}</p>
        </NavLink>
      </nav>
    </>
  );
};

export default MobileMenu;
```

### 3.3 `src/componets/mobilemenu/style.css`

```css
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s ease, visibility 0.25s;
  z-index: 1500;
}
.mobile-overlay.is-visible { opacity: 1; visibility: visible; }

.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  height: 100dvh;
  width: min(82vw, 320px);
  background: var(--green);
  padding: 96px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1600;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.3);
}
.mobile-menu.is-open { transform: translateX(0); }

.mobile-menu a {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 12px 14px;
  border-radius: 12px;
  color: var(--white);
  font-size: 16px;
  font-weight: 600;
}
.mobile-menu a:active,
.mobile-menu a:hover { background: rgba(255, 255, 255, 0.1); }
.mobile-menu img { width: 26px; height: 26px; }
```

### 3.4 Подключение в `src/componets/navbar/Nav.jsx`

```jsx
import MobileMenu from "../mobilemenu/MobileMenu.jsx";
// ...
    <div className="nav">
      <div className="logo"><img src={logo} alt="" /></div>
      <div className="nav-list">…</div>
      <MobileMenu user={user} />
    </div>
```
То же самое — в `src/componets/navbardark/Nav.jsx`.

### 3.5 `src/componets/navbar/style.css`

```css
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;          /* добавить: кнопка бургера должна центрироваться */
  margin-top: 32px;
  padding: 20px var(--pad-page);
  height: auto;                 /* было: 129px */
  min-height: 129px;
  width: 100%;
  gap: 16px;
}
```
Заменить медиа-блок строк 52–56:
```css
@media (max-width: 1200px) {
  .nav-list { display: none; }
  .nav { margin-top: 16px; padding: 14px var(--pad-page); min-height: auto; }
}
```

### 3.6 `src/componets/navbardark/style.css`

```css
.navdark {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--green);
  position: sticky;
  top: 0;
  padding: 14px var(--pad-page);   /* было: 20px 50px */
  min-height: 72px;                /* было: 90px */
  height: auto;
  width: 100%;
  z-index: 1000;
  gap: 16px;
}
@media (max-width: 1200px) {
  .nav-list-dark { display: none; }
}
```
Убрать из этого файла продублированные `.nav-list-item`, `.nav-list-item-end`, `.nav-icons`, `.nav-icons-flag`.

---

## 4. Главная страница: `src/componets/search/style.css`

### 4.1 Проблемные места

| Элемент | Строка | Проблема |
|---|---|---|
| `.sop-box-search-air` | 58–69 | `min-width: 372px` — не помещается |
| `.air-item` | 70–81 | `min-width: 236px; height: 69px` |
| `.air-item-revers` | 88–106 | `position:absolute; left:47%` |
| `.sop-box-theme` | 107–116 | `width: 248px` |
| `.sop-btn` | 119–133 | `width: 235px` |
| `.tab-btn` | 170–184 | `min-width: 206px` |

### 4.2 Медиа-блок в конец файла

```css
@media (max-width: 1440px) {
  .searchcontainer { padding: 0 16px; width: 100%; }
  .searchbox { width: 100%; }
}

@media (max-width: 968px) {
  .searchcontainer { min-height: auto; padding: 0 16px; }
  .searchbox { padding: 16px; border-radius: 20px; }

  .s-optiontour { flex-direction: column; align-items: stretch; }

  .sop-box-search-air { min-width: 0; max-width: none; width: 100%; }
  .air-item { min-width: 0; flex: 1; height: auto; padding: 10px 14px; }

  /* абсолютный «сварк» больше не нужен — идёт в обычном потоке */
  .air-item-revers {
    position: static;
    left: auto;
    box-shadow: none;
    flex: 0 0 auto;
  }

  .sop-box-theme { width: 100%; }
  .sop-btn { width: 100%; }

  /* табы: одна горизонтальная строка (реализовано — .tabswraper удалён,
     см. «Мобильный поиск ≤968» в статусе) */
  .tabsoption { max-width: 100%; width: 100%; flex-wrap: nowrap; gap: 4px; padding: 6px; min-height: 60px; border-radius: 18px; margin-bottom: 6px; }
  .tab-btn { flex: 1 1 0; min-width: 0; height: 46px; padding: 8px 6px; gap: 6px; font-size: 14px; border-radius: 14px; align-items: center; }
  .tab-btn img { width: 18px; height: 18px; }
  .tourTypes { flex-wrap: wrap; max-width: 100%; height: auto; }
}

@media (max-width: 640px) {
  .searchbox { padding: 12px; gap: 12px; border-radius: 16px; }
  .s-optiontour { gap: 12px; min-height: auto; }
  .air-item { width: 100%; }
  .tabsoption { padding: 4px; min-height: 52px; border-radius: 14px; }
  .tab-btn { flex: 1 1 0; height: 44px; padding: 6px 4px; gap: 4px; font-size: 13px; border-radius: 12px; }
  .tab-btn img { width: 16px; height: 16px; }
  .sop-btn { height: 56px; padding: 14px 20px; }
}
```

### 4.3 Липкая панель поиска — `src/componets/hotelsearch/style.css`

> **Апдейт:** на ≤968 `NewHotelSearch`/`Toursearch` **не рендерят** `.s-container` вообще — вместо него `MobileSearch variant="results"` (кнопка-саммари + шторка). Правила ниже остаются справочно; на десктопе `.s-container` по-прежнему `position: sticky; top: 84px; z-index: 1000`.

```css
@media (max-width: 968px) {
  .s-container {
    height: auto;
    position: static;          /* sticky со 105px высоты на телефоне не нужен */
    padding: 12px 16px;
    gap: 12px;
  }
  .s-option { height: auto; flex-wrap: wrap; gap: 12px; }
  .sop-btn { width: 100%; }
}
```

---

## 5. Списки `/hotels` и `/tours`

### 5.1 `src/componets/hotels/newhotels/style.css`

**Заменить фиксированные ширины:**

```css
/* строка 7 — .mcontainer */
.mcontainer {
  display: flex;
  gap: var(--gap-grid);
  padding: 32px var(--pad-page) 20px;   /* было: 32px 70px 20px 70px */
  background-color: var(--bg);
  width: 100%;
}

/* строка 18 — .hotel-box */
.hotel-box {
  width: 100%;              /* было: 1259px */
  max-width: 1259px;
}

/* строка 59 — .grid-card: убрать min-width, иначе ломает grid */
.grid-card { min-width: 0; max-width: 950px; }

/* строка 97 — картинка карточки */
.grid-card-img-box img { width: 100%; max-width: 350px; }

/* строки 253, 272 — фильтры */
.filter-wrapper, .filter-box { width: 100%; max-width: 430px; }
```

**Заменить `@media (max-width:1300px)` (строки 283–291) на:**

```css
@media (max-width: 1200px) {
  .mcontainer { flex-direction: column; padding: 24px var(--pad-page) 16px; }
  .filter-wrapper, .filter-box { max-width: none; }

  /* фильтры → выдвижная панель */
  .filter-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: min(88vw, 430px);
    max-width: none;
    background: var(--bg);
    padding: 80px 16px 24px;
    overflow-y: auto;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 1500;
  }
  .filter-wrapper.is-open { transform: translateX(0); }

  /* кнопка вызова фильтров (см. 5.3) */
  .filter-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    border-radius: 16px;
    background: var(--white);
    border: 1px solid var(--light_gray);
    font-weight: 600;
    cursor: pointer;
  }
}
@media (min-width: 1201px) {
  .filter-toggle-btn { display: none; }
}

@media (max-width: 640px) {
  .mcontainer { padding: 16px var(--pad-page); gap: 12px; }
  .hotelbox-grid { gap: 12px; padding: 0; }

  /* горизонтальная карточка → вертикальная */
  .grid-card { flex-direction: column; height: auto; min-width: 0; }
  .grid-card-img-box { width: 100%; height: 180px; border-radius: 25px 25px 0 0; }
  .grid-card-img-box img { position: static; height: 180px; max-width: none; border-radius: 25px 25px 0 0; }
  .grid-card-rigth-box { width: 100%; }
  .card-heder-info { flex-direction: column; gap: 8px; align-items: flex-start; }
  .infoleft { max-width: 100%; }
  .card-footer { gap: 12px; }
  .rating-card-ab { left: auto; right: 12px; top: 12px; width: 96px; height: 44px; }
}
```

### 5.2 `src/componets/tours/style.css`

Те же правки:

```css
/* строки 7, 18, 59, 99, 111, 184, 204 */
.mcontainer { padding: 32px var(--pad-page) 20px; gap: var(--gap-grid); }
.hotel-box   { width: 100%; max-width: 1259px; }
.tourgrid-item{ min-width: 0; max-width: 656px; }
.loc-name, .loc-dist { width: auto; max-width: 100%; }
.filter-wrapper, .filter-box { width: 100%; max-width: 430px; }
```

`@media (max-width:1300px)` (строки 215–223) → заменить на `@media (max-width: 1200px)` с тем же содержимым + drawer для фильтров (копия из 5.1). Дополнительно:

```css
@media (max-width: 640px) {
  .hotel-grid { grid-template-columns: 1fr; gap: 12px; }
  .tourgrid-item { height: auto; min-width: 0; }
  .tourgrid-item img { height: 200px; }
  .item-heder-info { flex-direction: column; gap: 8px; align-items: flex-start; }
  .info-left { max-width: 100%; }
  .item-footer { flex-direction: column; gap: 10px; align-items: flex-start; }
}
```

### 5.3 Кнопка «Фильтры» (состояние в компоненте)

В `HotelResult.jsx` / `Tournew.jsx` добавить:

```jsx
import { useState } from "react";
const [filtersOpen, setFiltersOpen] = useState(false);
// ...
<button className="filter-toggle-btn" onClick={() => setFiltersOpen(v => !v)}>
  Filters
</button>
<div className={`filter-wrapper ${filtersOpen ? "is-open" : ""}`}> … </div>
```

> На десктопе `.filter-toggle-btn` скрыт (`min-width: 1201px`), поведение не меняется.

---

## 6. Страница отеля / тура / брони

### 6.1 `src/componets/hotels/hotelpage/style.css`

```css
/* строка 10 */
.hpagecontainer { padding: 32px var(--pad-page) 20px; }

/* строка 45 — .infoheder */
.infoheder { max-height: none; height: auto; flex-wrap: wrap; gap: 16px; }

/* строки 57, 84 */
.hederleft  { height: auto; }
.hederrigth { height: auto; max-width: 370px; width: 100%; }

/* строка 75 */
.loc-dist { width: auto; max-width: 100%; }
```

```css
/* в конец файла */
@media (max-width: 968px) {
  .infoheder { padding: 20px; }
  .hederrigth { max-width: none; }
}
@media (max-width: 640px) {
  .hpagecontainer { padding: 20px var(--pad-page) 16px; gap: 12px; }
  .infoheder { padding: 16px; border-radius: 20px; }
  .backoption button { padding: 12px 16px; height: 44px; }
}
```

### 6.2 `rooms/style.css` и `touroption/style.css` (правки идентичны)

```css
/* строки ~27 и ~35 в обоих файлах */
.content-row { flex-direction: column; gap: 20px; }   /* базово лучше уже так, если карточка 313px */
.card { width: 100%; max-width: 313px; }
.rcontainer { padding: 24px var(--pad-page); }
```

```css
@media (max-width: 968px) {
  .card { position: static; max-width: none; max-height: none; }
  .content, .content-t { gap: 20px; }
}
@media (max-width: 640px) {
  .rcontainer { padding: 20px 16px; border-radius: 20px; }
  .cart-box { width: 100%; }
}
```

### 6.3 `src/componets/tourbook/style.css`

```css
/* строка 218 */
.cardnew { width: 100%; max-width: 400px; }

@media (max-width: 968px) {
  .payments .details { grid-template-columns: 1fr; gap: 2px; }
}
@media (max-width: 640px) {
  .cart .steps { padding: 14px; }
  .titlecard { padding-left: 14px; }
}
```

### 6.4 Календари — `datepicker/style.css` и `datepickerhotel/style.css`

```css
/* строки 24–39 (datepicker) */
.date-wrapper {
  left: 0;              /* было: -23px */
  right: 0;
  width: 100%;
  min-width: 300px;
  max-width: 360px;
}

/* строки 78, 95 и аналогичные в datepickerhotel (111, 128) */
.wekday, .days { grid-template-columns: repeat(7, 1fr); gap: 0 2px; }
.days button { width: 100%; min-width: 0; height: 42px; padding: 4px; }

/* строка 2 */
.dp-box { min-width: 0; width: 100%; }
```

```css
@media (max-width: 640px) {
  .date-wrapper { max-width: none; padding: 12px 8px; }
  .days, .wekday { grid-template-columns: repeat(7, 1fr); }
  .days button { font-size: 14px; height: 40px; }
  .wekday-block { padding: 0 2px 8px; font-size: 13px; justify-content: center; }
}
```

---

## 7. Профиль — `src/componets/profile/style.css`

Текущая проблема: `#navbar` (строка 103) — `position: fixed; width: 5em; height: 100vh`, раскрывается по `:hover` (строка 116) — на тач-устройствах не работает.

```css
/* строка 1 — .pcontainer */
.pcontainer {
  display: flex;
  gap: 16px;
  padding: 10px var(--pad-page);
  background-color: var(--bg);
  width: 100%;
  overflow-x: hidden;
}

/* базовое правило контента (строка 12) остаётся:
   .profile-box { margin-left: var(--sidebar-collapsed-width); } */
```

```css
/* в конец файла */
@media (max-width: 1200px) {
  #navbar { width: 4.5em; }
}

@media (max-width: 968px) {
  .pcontainer { flex-direction: column; padding: 12px var(--pad-page); gap: 12px; }

  /* сайдбар → горизонтальный таб-бар */
  #navbar {
    position: static;
    width: 100%;
    height: auto;
    min-height: 0;
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 16px;
    padding: 8px;
    gap: 6px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  #navbar::-webkit-scrollbar { display: none; }
  #navbar:hover { width: 100%; }

  .navbar-items { display: flex; gap: 6px; }
  .navbar-items a,
  .navbar-items button { white-space: nowrap; min-height: 44px; padding: 10px 14px; }

  .profile-box { margin-left: 0; padding-left: 0; width: 100%; }
  .menu-wrapper { min-width: 0; width: 100%; }
  .tab-content { gap: 16px; }
  .tab-content-box { width: 100%; }
}

@media (max-width: 640px) {
  .pcontainer { padding: 10px var(--pad-page); }
  .tab-item { padding: 10px; }
  .tab-item h2 { font-size: 18px; }
  .tab-info-box { padding: 8px; }
}
```

> Hover-раскрытие сайдбара (`#navbar:hover { width: 16em }`) на десктопе оставить как есть.

---

## 8. Порядок работ

| Шаг | Что | Файлы | Риск |
|---|---|---|---|
| 1 | Каркас + токены | `main.css` | низкий — сразу видно результат |
| 2 | Навбары + бургер | `navbar-common.css`, `MobileMenu.jsx`, 2 навбара | средний — нужна проверка всех страниц |
| 3 | Списки `/hotels`, `/tours` | `newhotels/style.css`, `tours/style.css` | средний — drawer фильтров |
| 4 | Главная + поиск | `search/style.css`, `hotelsearch/style.css` | низкий |
| 5 | Отель/тур/бронь | `hotelpage`, `rooms`, `touroption`, `tourbook`, `datepicker*` | низкий |
| 6 | Checkout/Confirmation | `main.css` (готово в 2.6) | низкий |
| 7 | Профиль | `profile/style.css` | средний |

Каждый шаг — отдельный коммит, чтобы легче откатывать.

---

## 9. Чеклист приёмки

**Ширины:** 1920 · 1440 · 1280 · 1024 · 768 · 414 · 360

```js
// в консоли браузера — не должно быть true
document.documentElement.scrollWidth > window.innerWidth
```

- [ ] Нет горизонтального скролла ни на одной из ширин
- [ ] Навбар: на ≤1200 появляется бургер, меню открывается, `body` не скроллится под ним
- [ ] Одинаковое поведение `navbar` (home) и `navbardark` (все внутренние страницы)
- [ ] Поиск на главной: поля не переполняются, кнопка «поменять местами» не наезжает
- [ ] `/hotels`, `/tours`: фильтры доступны через кнопку на ≤1200, карточки не обрезаны
- [ ] Календарь: 7 колонок помещаются, попап не выходит за экран
- [ ] Checkout: 1 колонка на ≤968, сводка идёт после формы
- [ ] Профиль: на ≤968 сайдбар превращается в таб-бар, `margin-left: 0`
- [ ] Тап-цели ≥ 44px, поля ввода ≥ 16px
- [ ] `npm run lint` — без ошибок
- [ ] `npm run build` — сборка проходит

---
---

# СТАТУС РАБОТ (обновлено)

Проверка перед любым шагом:
```bash
npm run build   # обязан пройти
npm run lint    # базовая линия: 79 problems (68 errors, 11 warnings) — НЕ УВЕЛИЧИВАТЬ
                # (до чистки мёртвого кода было 192; +1 к прошлой базе 80 — не из файлов
                #  сессии 15.10, git-бинарника нет для точной атрибуции; после сессии профиля 68)
```

## Выполнено

| Шаг | Что | Где |
|---|---|---|
| 1 | Токены `--pad-page` / `--gap-grid` / `--radius-card`, `#root` без `width:1900px`, `.container` `100dvh`, `h1` через `clamp()` | `main.css` |
| 2 | Бургер-меню + shared navbar-классы | `navbar-common.css`, `mobilemenu/MobileMenu.jsx`, оба навбара |
| 3 | Списки `/hotels`, `/tours` + **drawer фильтров** (MUI) + сортировка | `results-common.css`, `filterdrawer/`, `hotelFilters/style.css`, `hotels/sorting/style.css` |
| 3+ | Фикс фото-фона: `html` (весь документ), `container` без фона, паддинг снизу | `main.css` |
| 3+ | z-index: `.nav`/`.navdark` → `2000` (меню пряталось под `.s-container z-index:1000`) | оба навбара |
| 4 | Главная + поиск: гибкие ширины полей | `search/style.css`, `hotelsearch/style.css` |
| 5 | **Единый контейнер `.maincontent` / `.hcontainer` / `.rcontainer`** | **новый `styles/detail-common.css`** |
| 5 | Страница отеля | `hotels/hotelpage/style.css` |
| 5 | Страница тура: 1 фото вместо дублей, стейт ошибки + Retry | `tourpage/style.css`, `pages/tourpage.jsx` |
| 5 | Transfer-кнопки: короткие подписи + иконки, сетка 3×1, вертикальные на мобиле | `mock/transfers.js`, `touroption/Optionew.jsx`, `touroption/style.css` |
| 5 | Календари: жидкое `repeat(7, minmax(0,1fr))`, кнопки `width:100%` | `datepickerhotel/style.css`, `datepicker/style.css` |
| 5 | Searchbox: пропорциональный flex вместо фикс. ширин и `space-between` | `search`, `qureytour`, `datepickerhotel` |
| 5 | Сортировка фильтра: рабочий `flex-wrap` | `hotelFilters/style.css` |
| 5 | Номера / опции / бронь тура | `hotels/rooms/`, `touroption/`, `tourbook/` |
| 6 | Checkout/Confirmation | `main.css` |
| 7 | Адаптив auth: стекло `rgba(244,244,244,.55)+blur` на `.mains`, инпуты 16px, тапы 44px, `min-height:100dvh` | `auth/signform/style.css` |
| 7 | **Нижняя шторка** `BottomSheet` (оверлей 2100 / панель 2150, `inert`, Escape, body-lock, возврат фокуса на триггер); `filterdrawer` z-index → 2100/2150 | `bottomsheet/` |
| 7 | **Общие поля поиска**: `field-common.css` (`.dp-box/.dp-wrapper/.qb-wrapper/.dp`), `CalendarGrid` (single/range × popup/sheet), `GuestsContent` + `guestsUtils`, `Pleasenew`/`CityTour` получили `variant`, селекторы → тонкие обёртки, гости у родителей через `value=` (без remount) | `styles/field-common.css`, `datepicker/CalendarGrid.jsx`, `quest/`, `qureytour/` |
| 7 | **Мобильный поиск ≤968**: `useMediaQuery` + `searchfields/MobileSearch` (см. ниже), подключён в `Search`, `NewHotelSearch`, `Toursearch` | `utils/useMediaQuery.js`, `searchfields/` |
| 7 | **Табы главной**: `tabswraper` удалён, `tabsoption` — единственная оболочка; ≤968 один горизонтальный ряд | `search/Search.jsx`, `search/style.css` |
| 7 | **Чистка мёртвого кода**: 16 файлов удалено (Hotelsearch, Please, QureyTour, DatePicker, themeTour/, rooms/, card/, roomcounter/, Option, sorting, HotelFilters, Confirmation_old, Checkout_old, tours/Tour, Slots, succeses) + мёртвые импорты/стейты в `Search`/`Toursearch` → lint 192 → 80 | `src/componets/**` |
| 7+ | **Отступ в шторке локации**: `.dropdown .dest-wrapper--sheet { margin-top: 12px }` — список подсказок не прилипает к инпуту (попапу на десктопе не мешает: там `position:absolute`) | `qureytour/style.css` |
| 7+ | **Сброс локации при смене таба главной**: `switchTab()` чистит `city` + `pleaseId` (иначе в Hotels уезжал город тура **без `pleaseId`** → ошибка API); десктопные `CityTour`/`PleaseSearch` получили `initialCity` + `key={...-${city}}` — тот же паттерн, что на `/hotels` и `/tours` | `search/Search.jsx` |
| 7+ | **Guard поиска отелей**: пока не выбран город из подсказок LiteAPI (`pleaseId` пуст), Search — `disabled` (`--light_gray` фон + `--gray_text` текст, иконка `filter: brightness(.4)`) + подсказка «Select a city from the suggestions» (`.s-hint` / `.msearch-hint` с белой «пилюлей», чтобы читалась поверх фото); `Pleasenew` получил `onCityEdit` — правка текста инвалидирует прежний выбор | `Search.jsx`, `searchfields/MobileSearch.jsx`, `qureytour/Pleasenew.jsx`, `styles/field-common.css` |
| 7+ | **Шторка локации закрывается сразу после выбора города** (и для тура, и для отеля) — как календарь через `onDone`; на результатах шторка остаётся открытой, чтобы заполнить все поля | `searchfields/MobileSearch.jsx` |
| 7 | **Профиль — редизайн + адаптив** (закрыт последний пункт шага 7): постоянный сайдбар 260px вместо `fixed`+`:hover` (на тач не работал); ≤968 — горизонтальный таб-бар со скроллом; табы в URL `?tab=overview|bookings|settings`; старые `NavBar.jsx`/`flexbox-*`/`--sidebar-*-width` удалены | `profile/*`, `main.css` |
| 7 | **Профиль · Bookings**: карточки (иконка типа, reference/PNR, дата, сумма+валюта, статус-бейдж), фильтры-чипы по статусу (All/Confirmed/Pending/Cancelled/Completed) и типу сервиса, счётчики; детали — правый drawer на desktop (`2100/2150`, Esc, body-lock, возврат фокуса), `BottomSheet` на ≤968; для рейсов — сегменты из `meta.segments` (маршрут/время/рейс), PNR, пассажиры | `profile/BookingsPanel.jsx`, `BookingCard.jsx`, `BookingDetailsPopup.jsx` |
| 7 | **Профиль · Settings**: личные данные (first/last name в `user_metadata`, email read-only), смена пароля (re-auth текущим + `updateUser({password})`), выбор валюты (AED/USD/EUR/GBP/RUB) в `user_metadata` + `localStorage` | `profile/SettingsPanel.jsx`, `AuthContext.jsx`, `utils/currency.js` |
| 7 | **Валюта в поиске**: `buildRatesRequest` (flights) и отельные rates больше не хардкодят AED — берут валюту профиля; при ошибке «currency» провайдера — автоповтор с AED (`*WithCurrencyFallback`) | `utils/flightSearch.js`, `FlightsResult.jsx`, `HotelResult.jsx`, `HotelPages.jsx` |
| 7+ | **Валюта отеля — отображение**: все цены отеля (карточки результатов, шапка отеля, тарифы, чекаут, ваучер, `currency` брони) показываются в фактической валюте провайдера (`rate.retailRate.total[0].currency` / `priceInfo.currency`) с fallback `getStoredCurrency()`; sandbox LiteAPI поддерживает USD/EUR/GBP/AED | `HotelResult.jsx`, `HotelPages.jsx`, `Roomsnew.jsx`, `hotels/checkout/Checkout.jsx`, `hotels/confirmation/Confirmation.jsx` |
| 7 | **Deep-link `?tab=bookings`**: после брони рейса/отеля кнопка «Go to My Bookings» ведёт сразу в список броней | `FlightConfirmation.jsx`, `hotels/confirmation/Confirmation.jsx` |
| 7+ | **Профиль · выравнивание сайдбара**: `.pcontainer` `overflow-x: hidden → clip` — контейнер перестал быть scrollport, sticky-сайдбар встал вровень с контентом (был сдвинут вниз на ~60px); CDP: `delta=0` | `profile/style.css` |
| 7+ | **Профиль · детали отеля**: Checkout пишет номер/питание/возврат в `localStorage.hotelBookingMeta` → Confirmation сохраняет в `bookings.meta` (`rooms[{name,board,refundable}]`, checkin/checkout, adults/children, holder) + `reference` = bookingId, `currency` AED; `addBooking(name, sum, Service, { reference, orderRef, meta, currency })` | `hotels/checkout/Checkout.jsx`, `hotels/confirmation/Confirmation.jsx`, `AuthContext.jsx` |
| 7+ | **Профиль · Stay details + Vouchers**: в деталях брони — Stay details (Room/Meal plan/Guests/Check-in/Check-out + бейдж Free cancellation/Non-refundable из `meta.rooms[].refundable`) и Vouchers для всех типов: ссылки из `meta.vouchers` (`[{title,url}]`) либо заглушка «will appear here» (наполнение — из админ-панели, будущее) | `profile/BookingDetailsPopup.jsx`, `profile/style.css` |
| 7+ | **Flights · Мультипассажиры (Sprint 4)**: `passengerType` (0/1/2) в prebook-payload; серверная валидация counts/types/DOB/паспорта (`BAD_REQUEST`); возрастные хинты в картах (`.fpax-card-hint` — 12+ / 2–11 / Under 2) и DOB `min/max` от даты вылета; smoke multi-pax flow (негативные count/type/DOB → исправный цикл) | `flights/FlightDetails.jsx`, `flights/style.css`, `flights-booking/index.ts`, `scripts/flights-smoke.mjs` |
| 7+ | **Отель · Полная meta брони**: цепочка `Roomsnew → Checkout → Confirmation` сохраняет в `bookings.meta` всё — отель (id/address/city/country/stars/rating/photo), номер (`rateId`/`bedType`/`size`/`maxGuests`), возврат с дедлайном (`cancellationPolicies.cancelPolicyInfos[0]`), `nights`, `holder`/`email`, цену (`total`/`perNight`) и разбивку налогов (`retailRate.taxesAndFees`); в деталях профиля — Stay details (Bed type/Room size/Nights/Address + дедлайн «Free cancellation until … GMT») и блок **Price details** (налог «(payable at hotel)» для `included:false`) | `hotels/rooms/Roomsnew.jsx`, `hotels/checkout/Checkout.jsx`, `hotels/confirmation/Confirmation.jsx`, `profile/BookingDetailsPopup.jsx`, `profile/bookingUtils.jsx` |

### Сессия 15.10 — PageLoader, туры, страница отеля (всё подтверждено пользователем)

| Шаг | Что | Где |
|---|---|---|
| 8 | Единый **`PageLoader`** (`embedded`-режим для встраивания в контент), все страницы переведены с `OrbitProgress`; `.loader-not`-хелпер | `loaders/PageLoader.jsx`, `loaders/style.css`, правки `HotelResult`, `Checkout`, `Confirmation`, `tourpage.jsx` и др. |
| 8 | **Карточки туров (variant B)**: full-bleed фото, светлая glass-панель снизу, плашка «Top rated» | `tours/Tournew.jsx`, `tours/style.css` |
| 8 | **Страница тура — split-hero**: фото слева / инфо справа (fav + цена), откат хардкодов | `tourpage/Tour.jsx`, `tourpage/style.css` |
| 8 | **Галерея отеля**: десктоп-сетка 5 фото + ячейка «+N more» → **lightbox** (fixed, стрелки, Esc/←/→, счётчик), мобиле — карусель | `slider/HotelGallery.jsx`, `slider/hotelgallery.css` |
| 8 | **Hero отеля во всю ширину**: галерея внутри `.hotel-hero { padding:0; border-radius:30px; overflow:hidden }` — углы сетки скруглены карточкой, инфо-строка **под** сеткой (имя/рейтинг/локация слева, цена справа), `.hotel-about` отдельной карточкой; мёртвые классы (`infoheder*`, `hcarusel*`, `loc-name`…) вычищены | `hotelpage/HotelPages.jsx`, `hotelpage/style.css` |
| 8 | **SentimentBlock** («Review highlights»): score из категорий sentiment (tone green/amber/red), label mapping, «Based on N reviews», чипы «What guests liked / didn't like», категории-бары, «Show details» раскрывает `description`; guard — пустой → `null` | `hotelpage/SentimentBlock.jsx` |
| 8 | **PopularFacilities**: топ-10 чипов с иконками + заголовок «See all»; **попап Facilities** — Popular + keyword-группировка в General/Services/Food/Internet/Parking/Wellness/Outdoors/Other | `hotelpage/PopularFacilities.jsx` |
| 8 | **GuestReviews**: сервис `/data/reviews` через liteapi-proxy; score из sentiment (консистентность), чипы топ-комментариев, «Who stays here» % по `type`, сортировка (Newest/Oldest/Highest), список + Load more (+5), «Showing N of M» | `hotelpage/GuestReviews.jsx`, `services/SupebaseReviewsService.jsx` |
| 8 | **RoomDetailsPopup**: кнопка «Room details» под фото номера → попап: галерея (hd_url→url→main_photo отеля, стрелки/счётчик/клавиши), м²/Sleeps/bedTypes, описание, «Popular amenities» топ-6, категории `roomAmenities` (CSS `columns:2`, мэсонри); ≤640 — на весь экран `100dvh` | `rooms/RoomDetailsPopup.jsx`, `rooms/Roomsnew.jsx`, `rooms/style.css` |

> Все новые файлы этих сессий чистые по линту; `Roomsnew` — только старый warning `getRoomImage` (exhaustive-deps).

## Мобильный поиск ≤968 — архитектура

- Включение: `useMediaQuery("(max-width: 968px)")` (`src/utils/useMediaQuery.js`, `useSyncExternalStore`). Компоненты монтируются **условно** — десктопные панели на мобиле просто не рендерятся, `display:none`-хаки не нужны.
- `src/componets/searchfields/MobileSearch.jsx` — единственный вход, два режима:
  - `variant="home"` (главная): чипы `.mchip` (label + value) → по клику своя `BottomSheet` (город / даты / гости), под чипами красная `.msearch-btn`. Вкладка Flights на мобиле скрыта (статический демо-блок).
  - `variant="results"` (`/hotels`, `/tours`): липкая `.msearch--results` (top:0, z-index 1000) с `.msummary-btn` — саммари «город · даты · гости», стоит **над** кнопкой Filters; одна шторка, поля стопкой, Search в `footer`.
- Контент шторок — те же компоненты с `variant="sheet"`: `Pleasenew|CityTour` (`.dest-wrapper--sheet` — список в потоке, скролл), `CalendarGrid` (`.calendar-sheet`), `GuestsContent` (`.gcontent-sheet`).
- Стейт поиска — у родителей (`Search`, `NewHotelSearch`, `Toursearch`), URL = источник истины; поля получают `value=` + `onXChange`; у локации `key={`city-${city}`}` (mount-init вместо эффекта, `initialCity` — единственный вход).
- Календарь: туры `mode="single"`, отели `mode="range"`; в home-шторке передаём `onDone` → шторка закрывается после выбора.
- z-index: шторка 2100/2150 (= filterdrawer), навбар 2000, сводка 1000.
- Табы главной (финальные цифры): десктоп `.tabsoption` — `padding:10px 16px`, `min-height:72px`, `max-width:726px`, `rgba(255,255,255,.17)` + `blur(8px)`, radius 50; ≤968 — `flex-wrap:nowrap`, `gap:4px`, `padding:6px`, `margin-bottom:6px`, radius 18, `.tab-btn { flex:1 1 0; height:46px; font-size:14px; border-radius:14px; align-items:center }`, иконки 18px; ≤640 — `height:44px`, `font-size:13px`, radius 12, иконки 16px.
- `BottomSheet`: `aria-hidden` на панели **не ставим** (конфликтует с фокусом → «Blocked aria-hidden…»), только `inert`; фокус возвращается на элемент-триггер при закрытии.

## ГЛАВНАЯ ЛОВУШКА — дубли классов

CSS в бандле склеивается в порядке импорта из `App.jsx`. Если **один и тот же класс** объявлен в двух файлах — побеждает тот, что идёт **позже**, и тихо перетирает адаптив.

Это уже дважды ломало страницу:

| Класс | Где был конфликт | Следствие |
|---|---|---|
| `.hcontainer` | `tourbook/style.css` (`padding: 32px 70px`, **без `@media`**) против `tourpage/style.css` | адаптивный паддинг тура не применялся, страница «узкая» |
| `.rcontainer` | `hotels/rooms/style.css` против `touroption/style.css` | мобильное правило не срабатывало |

**Правило: перед добавлением любого стиля проверять `grep -r "\.имя" src` — если встречается 2+ раза, объединять в `detail-common.css`, а дубли удалять.**

## Прочие паттерны, на которые наткнулись

1. **`<img>` с `flex: 1` не сжимается** — у replaced-элементов дефолтный `min-width: auto` = натуральная ширина. Галерея вылезала за экран. Лечится `min-width: 0`.
2. **`flex: 1` = `flex-basis: 0%` → `flex-wrap` не работает никогда.** Элементы всегда влезают в строку и сжимаются в высоту. Для переноса нужен реальный `flex-basis` + `min-width` (см. `.rating-btn`, `.sop-box-*`).
3. **`align-items: flex-start` / `center` у flex-column-родителя** → дети сжимаются до контента вместо `width: 100%` (`.content-t`, `.searchcontainer`).
4. **`max-width`-капы + `justify-content: space-between`** → остаток ширины выкидывается в промежутки. Заменять на пропорциональный `flex` без капов.
5. **Вложенность паддингов**: `.hcontainer` (16px) + `.rcontainer` (16px) = 32px с каждой стороны на телефоне. Решение — на ≤968 снимать белую карточку `.rcontainer` (`background: transparent; padding: 0`).
6. **`.option-box` наследовал белый фон от `.rcontainer`** — при снятии карточки фон надо задать явно, иначе элемент становится серым.
7. **Наследуемые на мобиле `max-width`** — после перевода в колонку обязательно снимать `flex: none; width: 100%; max-width: none`.
8. **Позиционированные попапы** — `width: 100%` считается от **позиционированного родителя**, а не от видимого блока (календарь внутри `.dpicker-checkin` = половина поля → 171px). Использовать фикс. ширину + `max-width: calc(100vw - 32px)`.
9. **Фото-фон на `html`** — всё, что без своего фона, показывает картинку. У `.maincontent` обязательно `min-height: 100dvh` + `background-color: var(--bg)`.
10. **`overflow-x: hidden` у предка ломает `position: sticky`** — контейнер становится scroll-контейнером, и `top` залипшего элемента отсчитывается от его padding-края, а не от окна (сайдбар профиля «висел» на 60px ниже контента при scroll 0). Лечение: `overflow-x: clip` — клипает, но scroll-контейнером не делает (если клип без скролла, `clip` предпочтительнее `hidden`).
11. **Grid-колонка `1fr` раздувается min-content детей** — `1fr` = `minmax(auto, 1fr)`, и если у item'а min-content больше трека, контейнер вылезает за экран (карточки `/hotels`: 457px при вьюпорте 440 → горизонтальный скролл). Лечение: `grid-template-columns: minmax(0, 1fr)`. Искать диагностикой: элементы с `getBoundingClientRect().right > document.documentElement.clientWidth`.
12. **`height: 100%` у flex-item с абсолютным контентом схлопывается в 0** — если у родителя `height: auto`, процент не разрешается и `align-items: stretch` не помогает (явный процент перебивает stretch). Так «пропали» фото карточек `/hotels` на десктопе: `.grid-card-img-box { height: 100% }` + внутри `<img position:absolute; height:100%>` при `.grid-card { height: auto }`. Лечение: убрать процент у бокса (`height: auto`), stretch сам выровняет по строке; картинку внутри оставить `absolute; height: 100%`.

## Осталось

- [x] ~~**Шаг 7: профиль**~~ — сделан: постоянный сайдбар + таб-бар ≤968, Bookings (фильтры/детали), Settings (пароль, личные данные, валюта). CDP-проверка 1440/1280/768/440 — без overflow, 0 ошибок консоли. Пост-фикс 17.10: выравнивание сайдбара (`delta=0`), Stay details + Vouchers в деталях (проверено CDP-моком реального рендера).
- [ ] Найти/убрать оставшиеся дубли классов (checkout — проверить; профиль чист — классы с префиксами `.profile-*`/`.booking-*`/`.pdrawer-*`/`.ps-*`).
- [ ] `src/img/fon/startfon1x.jpg` — **7.1 MB**. Есть альтернативы: `startfon1x_c.jpg` (65 KB), `startfon1x_x.jpeg` (108 KB). Подключить оптимизированную.

### Линт-хвост (текущие 78 problems: 67 errors / 11 warnings)

- [ ] `HotelResult.jsx` — 21; `Optionew.jsx` — 8; `tourpage/Tour.jsx` — 5; `HotelPages.jsx` — 2 (`error` L75, `err` L119); `guestCounter.jsx` — 3; `Filterss.jsx` — 3 (в т.ч. `no-undef facilitService`); `Nav.jsx` (оба) — по 3.
- [ ] **URL-init `setState-in-effect`** в `NewHotelSearch.jsx` и `Toursearch.jsx` — лечить: ленивый `useState(() => readFromUrl(searchParams))` + `key={searchParams.toString()}` на `<SearchOption />` в `HotelResult`/`Tournew` вместо effect (поведение идентичное: state всегда = URL).

### Заметки по мобильному поиску

- [ ] Вкладка Flights на главной в мобиле скрыта — решить, показывать ли её (сейчас там статичный демо-блок с нерабочей кнопкой).
- [ ] Закомментированный демо-код в `Search.jsx` (ThemeTour, tourTypes) ссылается на **удалённые** импорты — при раскомментировании вернуть импорты.
- [ ] Чипсы на главной на ≤640 идут столбиком (`flex: 1 1 100%` в `searchfields/style.css`) — если нужен один ряд, как у табов, подправить `.mchip`.
- [ ] Локация — единственное поле **не** через `value=` (mount-init по `key`), поэтому чип/саммари показывает последний **выбранный** город, а не текст, который пользователь успел напечатать (поиск при этом заблокирован — guard по `pleaseId`). Полный фикс = перевести `Pleasenew`/`CityTour` на контролируемые `value` + `onChange` у родителя.
- [ ] `/hotels` без `pleaseId` в URL (прямой заход) — guard’а нет, кнопка Search живая, уходит в пустой `placeId`. Добавить так же, как на главной, если будет запрос.
- [ ] Минифайлер бандла оставляет только `-webkit-backdrop-filter` для `blur(8px)/16px/2px` (со всеми glass-элементами проекта) — в Firefox размытия не будет, только полупрозрачный фон. Если важен FF — проверить, почему `backdrop-filter` (без префикса) выпадает.

## Полезные находки

- MUI установлен (`@mui/icons-material`, `@mui/material`) — используется проектом, брать иконки оттуда. **Но не все существуют**: `PersonOutline`, `ExtensionGuide`, `Wind` → использовать `Person`, `Extension`, `Air`. Остальные иконки из сессий 15.10 проверены.
- `rg` (ripgrep) **не установлен** — искать через PowerShell `Select-String` или grep-инструмент. **Git-бинарника тоже нет в PATH** — diff/atribution изменений только по mtime файлов.
- `Loader` = `src/componets/loaders/loading.jsx` (`OrbitProgress`) — **заменён на `PageLoader`** (`loaders/PageLoader.jsx`, проп `embedded` для встраивания). Старый `loading.jsx` оставлен, сверяться, не мёртв ли.
- **LiteAPI Flights · prebook**: `passengers[].passengerType` (0=adult, 1=child, 2=infant) — request-поле; `type` (ADT/CHD/INF) только в ответах; длина `passengers` = adults+children+infants из поиска; возрастных ограничений в API нет — IATA-правила (12+ / 2–11 / <2 на дату вылета) валидируем сами; sandbox-офферы часто sold out (код 52010) — при e2e перебирать офферы, в UI маппить в `OFFER_SOLD_OUT` (инвентарь real-time, может «продаться» в любой момент между verify и book).
- **LiteAPI Flights · автокомплит аэропортов** (`/data/flights/airports`): возвращает дубли IATA («San Diego - All Airports» + «San Diego International Airport» = `SAN`, также `SJO`) — React-ключи списка уникализировать (`iata-index`), иначе duplicate key warning.
- **LiteAPI-данные отеля** (через Supabase edge fn `liteapi-proxy`, заголовки `x-target-url` + `x-service-type: 'hotels'`, паттерн в `SupebaseHotelIdService.jsx`):
  - `hotel.sentiment_analysis` = `{categories:[{name,rating(1-10),description}], pros[], cons[]}` (fallback-ключ `sentimentAnalysis`);
  - `hotel.facilities` = `[{facilityId,name}]` — **без категорий** → keyword-группировка локальная (`PopularFacilities.jsx`);
  - отзывы — **отдельный** endpoint `/data/reviews?hotelId=&limit=200` = `{data:[{averageScore,name,type,date,pros,cons,headline,source,reviewId}], total}` (`SupebaseReviewsService.jsx`);
  - `hotel.rooms[].roomAmenities` = `[{amenitiesId,name,sort}]` — тоже без категорий → `ROOM_AMENITY_CATEGORIES` в `RoomDetailsPopup.jsx`; `photos:[{url,hd_url,mainPhoto}]`, `bedTypes:[{quantity,bedType}]`;
  - `rate` (ответ `hotels/rates`, элементы `roomTypes[].rates[]`): `rateId`, `name`, `boardName`, `mappedRoomId`, `cancellationPolicies: {refundableTag: "RFN", cancelPolicyInfos: [{cancelTime:"YYYY-MM-DD HH:mm:ss", amount, currency, type, timezone}]}`, `retailRate: {total:[{amount,currency}], taxesAndFees:[{included, description, amount, currency}]}` (`included:false` — платится в отеле); `roomTypes[].offerId` и `offerInitialPrice` — на уровне roomType.
- **Тон/лейблы оценок** (единый паттерн во всех блоках): tone(r) — green ≥8 / amber ≥6 / red <6; scoreLabel(avg) — ≥9 Exceptional, ≥8 Very Good, ≥7 Good, ≥6 Pleasant, ≥5 Average, иначе Poor.
- **Fixed-попап внутри `.hotel-hero { overflow:hidden }` не обрезается** — покуда у предков нет `transform`/`filter`/`will-change` (проверять при любых правках hero!). z-index попапов: лайтбокс/фасилити/ревью — 5000, нижние шторки — 2100/2150, навбар — 2000.
- **`setState` синхронно в `useEffect` = error** (react-compiler-правило): сброс стейта попапа (`setIdx(0)`) делать при **открытии** (в обработчике клика), не в effect.
- **CDP-моки supabase-прокси**: на стадии Response `Fetch.getRequestPostData` **не отдаёт тело запроса** — гейтить мок по URL+методу (не по body); реальный `rates/book` с фейковым prebookId отвечает 400, body переписывается на fake success (CORS-заголовки upstream уже на месте, preflight трогать не нужно).
- **Минимальная ширина поддержки — 380px** (и ниже, до 320, держится): CDP-свип 320–440 (`mobile: false`, dsf 1) на `/`, `/hotels`, `/hotelpage` — 0 overflow. Проверка: `document.documentElement.scrollWidth` vs `clientWidth` + элементы с `right > clientWidth` (исключая off-canvas `.mobile-menu` и закрытый `.filter-wrapper` — они «вылезают» штатно). Прогонять после правок в карточках/шапке результатов.
- **Мобильный ряд кнопок над списком**: `.mcontrols` вокруг `FilterDrawer` — на десктопе `display: contents` (дети растворяются в `.mcontainer`, сайдбар на месте), ≤1200 — `flex` (ряд `[Filters][кнопка сортировки]`). Обёртка не требует правок самого дровера; ползунку кнопки фильтра задать `width: auto; flex: 1`.
- **`SORT_OPTIONS` вынесены в `sorting/sortOptions.js`**: файл компонента не должен экспортировать константы — правило `react-refresh/only-export-components` (lint).
- **На `/hotels` в DOM два `.bottomsheet`** (шторка поиска + шторка сортировки) — селекторы скоупить (`.sort-sheet` → `closest(".bottomsheet")`), иначе клик по `.bottomsheet-close` попадает в чужую шторку. В CDP-скриншотах `Page.captureScreenshot` с `clip` капризен к координатам (документ vs вьюпорт) — надёжнее `scrollIntoView` + снимок всего вьюпорта.
- **Позади шапки шторки сортировки**: `BottomSheet` переиспользован как есть (handle, крестик, inert, фокус-менеджмент) — обвязка уже готова, свои только `.sort-sheet*`.
- **Dev-сервер пользователя крутится на 5173** — `npm run dev` поднимается на **5174** (проверять контент через `Invoke-WebRequest`, в JSX идут `hotelId: hid` после компиляции).
- Referens-изображения макетов лежат в `public/`: `referens_tour ui.jpg`, `Rewiew_blok.png`, `facilities_popup.png`, `guest_reviews.png`, `room_detalis 1.png`, `room_detalis 2.png`.
- `mock/transfers.js`: поле `name` (полное) трогать нельзя — попадает в cart и используется в `touroption/Optionew.jsx` (старый `Option.jsx` удалён как мёртвый). Добавлять новые поля (`short`, `icon`).

