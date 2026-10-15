import { useState } from "react";
import BottomSheet from "../bottomsheet/BottomSheet";
import PleaseSearch from "../qureytour/Pleasenew";
import CityTour from "../qureytour/CityTour";
import CalendarGrid from "../datepicker/CalendarGrid";
import GuestsContent from "../quest/GuestsContent";
import { guestsDisplayText } from "../quest/guestsUtils";
import sbtn from "../../img/icons/tabicons/search.svg";
import "./style.css";

/* Мобильный поиск (≤968px, см. useMediaQuery).
   variant="home"    — главная: чипы, у каждого поля своя шторка,
                       красная кнопка Search под чипами;
   variant="results" — /hotels и /tours: кнопка-саммари (вместо липкой
                       панели полей), одна шторка со всеми полями
                       и Search в футере.
   Стейт (город/даты/гости) и обработчик поиска живут у родителя. */
const MobileSearch = ({
  variant = "home",
  mode = "hotel",
  city = "",
  onCityChange,
  dateMode = "range",
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  guests,
  onGuestsChange,
  onSearch,
  searchDisabled = false,
  searchHint,
  onCityEdit,
}) => {
  const [sheet, setSheet] = useState(null); // null | "city" | "date" | "guests" | "all"

  const closeSheet = () => setSheet(null);

  const isTour = mode === "tour";
  const isRange = dateMode === "range";

  const fmt = (date) => (date ? date.toLocaleDateString() : "");

  const locationValue = city || "Choose destination";
  const dateValue = isRange
    ? checkIn && checkOut
      ? `${fmt(checkIn)} – ${fmt(checkOut)}`
      : "Select dates"
    : fmt(checkIn) || "Select dates";
  const guestsValue = guestsDisplayText(guests);
  const summaryText = [locationValue, dateValue, guestsValue].join("  ·  ");

  // Выбор города закрывает собственную шторку на главной (как даты через onDone)
  const handleLocationChange = (...args) => {
    onCityChange?.(...args);
    if (variant === "home") closeSheet();
  };

  // Локация: туры — статичный список, отели — поиск через LiteAPI
  const locationField = isTour ? (
    <CityTour
      variant="sheet"
      initialCity={city}
      onCityChange={handleLocationChange}
      key={`city-${city}`}
    />
  ) : (
    <PleaseSearch
      variant="sheet"
      initialCity={city}
      onCityChange={handleLocationChange}
      onCityEdit={onCityEdit}
      key={`city-${city}`}
    />
  );

  // В собственной шторке на главной закрываем её после выбора даты
  const handleDone = variant === "home" ? closeSheet : undefined;

  const runSearch = () => {
    if (searchDisabled) return;
    onSearch?.();
    closeSheet();
  };

  const hint = searchDisabled && searchHint ? (
    <p className="msearch-hint">{searchHint}</p>
  ) : null;

  const searchButton = (
    <button
      type="button"
      className={`msearch-btn${searchDisabled ? " is-disabled" : ""}`}
      disabled={searchDisabled}
      onClick={runSearch}
    >
      <img src={sbtn} alt="" />
      <span>Search</span>
    </button>
  );

  const locationGroup = (
    <div className="bs-group bs-field">
      
      {locationField}
      {variant !== "home" && hint}
    </div>
  );

  const dateGroup = (
    <div className="bs-group">
      {/* <p className="bs-label">{isRange ? "Dates" : "When"}</p> */}
     
      <CalendarGrid
        variant="sheet"
        mode={dateMode}
        checkIn={checkIn}
        checkOut={checkOut}
        onCheckInChange={onCheckInChange}
        onCheckOutChange={onCheckOutChange}
        onDone={handleDone}
      />
    </div>
  );

  const guestsGroup = (
    <div className="bs-group">
      <p className="bs-label">Guests</p>
      <GuestsContent
        variant="sheet"
        mode={mode}
        value={guests}
        onChange={onGuestsChange}
      />
    </div>
  );

  if (variant === "home") {
    return (
      <div className="msearch msearch--home">
        <div className="mchips">
          <button
            type="button"
            className="mchip"
            onClick={() => setSheet("city")}
          >
            <span className="mchip-label">Where to?</span>
            <span className="mchip-value">{locationValue}</span>
          </button>
          <button
            type="button"
            className="mchip"
            onClick={() => setSheet("date")}
          >
            <span className="mchip-label">{isRange ? "Dates" : "When"}</span>
            <span className="mchip-value">{dateValue}</span>
          </button>
          <button
            type="button"
            className="mchip"
            onClick={() => setSheet("guests")}
          >
            <span className="mchip-label">Guests</span>
            <span className="mchip-value">{guestsValue}</span>
          </button>
        </div>

        {searchButton}
        {hint}

        <BottomSheet
          open={sheet === "city"}
          onClose={closeSheet}
          title="Where to?"
        >
          {locationGroup}
        </BottomSheet>

        <BottomSheet
          open={sheet === "date"}
          onClose={closeSheet}
          title={isRange ? "Dates" : "When"}
        >
          {dateGroup}
        </BottomSheet>

        <BottomSheet
          open={sheet === "guests"}
          onClose={closeSheet}
          title="Guests"
        >
          {guestsGroup}
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className="msearch msearch--results">
      <button
        type="button"
        className="msummary-btn"
        onClick={() => setSheet("all")}
      >
        <span className="msummary-text">{summaryText}</span>
      </button>

      <BottomSheet open={sheet === "all"} onClose={closeSheet} title={summaryText} footer={searchButton}>
        {locationGroup}
        {dateGroup}
        {guestsGroup}
      </BottomSheet>
    </div>
  );
};

export default MobileSearch;
