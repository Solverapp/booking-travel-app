import { useState } from "react";
import BottomSheet from "../bottomsheet/BottomSheet";
import AirportSearch from "./AirportSearch";
import FlightDates from "./FlightDates";
import GuestsContent from "../quest/GuestsContent";
import { guestsDisplayText } from "../quest/guestsUtils";
import { resolveSearchDates } from "../../utils/flightSearch";
import revers from "../../img/icons/tabicons/arrow-2.svg";
import sbtn from "../../img/icons/tabicons/search.svg";
import "../searchfields/style.css";
import "./style.css";

const AIRPORT_HINT = "Select airports from the suggestions";
const FLIGHT_GUEST_HINTS = { adults: "", children: "Ages 2-11", infants: "Under 2" };

/* Мобильный поиск перелётов (≤968px, см. useMediaQuery).
   variant="home"    — чипы Route/Dates/Passengers, у каждого своя шторка;
   variant="results" — саммари-кнопка + одна шторка со всеми полями
                       и Search в футере (страница /flights).
   Значения — внутренний стейт; initial — стартовые (с /flights). */
const MobileFlightSearch = ({
  variant = "home",
  initial,
  onSearch,
  searchDisabled = false,
  searchHint,
}) => {
  const [sheet, setSheet] = useState(null);
  const [origin, setOrigin] = useState(initial?.origin ?? null);
  const [destination, setDestination] = useState(initial?.destination ?? null);
  const [tripType, setTripType] = useState(initial?.tripType ?? "round");
  const [depart, setDepart] = useState(initial?.depart ?? null);
  const [returnDate, setReturnDate] = useState(initial?.returnDate ?? null);
  const [guests, setGuests] = useState(
    initial?.guests ?? { adults: 1, children: 0, infants: 0 },
  );
  const [cabin, setCabin] = useState(initial?.cabin ?? "all");

  const closeSheet = () => setSheet(null);

  const isRound = tripType === "round";
  const fmt = (date) => (date ? date.toLocaleDateString() : "");

  const routeValue =
    origin?.iata && destination?.iata
      ? `${origin.iata} → ${destination.iata}`
      : "Choose route";
  const datesValue = isRound
    ? depart && returnDate
      ? `${fmt(depart)} – ${fmt(returnDate)}`
      : "Select dates"
    : fmt(depart) || "Select date";
  const guestsValue = guestsDisplayText(guests);
  const summaryText = [routeValue, datesValue, guestsValue].join("  ·  ");

  const missingAirports = !(origin?.iata && destination?.iata);
  const disabled = missingAirports || searchDisabled;

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const runSearch = () => {
    if (disabled) return;
    const dates = resolveSearchDates({ tripType, depart, returnDate });
    onSearch?.({ origin, destination, tripType, ...dates, guests, cabin });
    closeSheet();
  };

  const hintText = missingAirports ? AIRPORT_HINT : searchDisabled ? searchHint : null;
  const hint = hintText ? <p className="msearch-hint">{hintText}</p> : null;

  const searchButton = (
    <button
      type="button"
      className={`msearch-btn${disabled ? " is-disabled" : ""}`}
      disabled={disabled}
      onClick={runSearch}
    >
      <img src={sbtn} alt="" />
      <span>Search</span>
    </button>
  );

  const routeGroup = (
    <div className="bs-group">
      <AirportSearch
        variant="sheet"
        label="From"
        value={origin}
        onSelect={setOrigin}
        onEdit={() => setOrigin(null)}
      />
      <button
        type="button"
        className="airport-swap-btn"
        aria-label="Swap airports"
        onClick={handleSwap}
      >
        <img src={revers} alt="" />
      </button>
      <AirportSearch
        variant="sheet"
        label="To"
        value={destination}
        onSelect={setDestination}
        onEdit={() => setDestination(null)}
      />
    </div>
  );

  const datesGroup = (
    <div className="bs-group">
      <FlightDates
        variant="sheet"
        tripType={tripType}
        onTripTypeChange={setTripType}
        depart={depart}
        returnDate={returnDate}
        onDepartChange={setDepart}
        onReturnChange={setReturnDate}
        onDone={variant === "home" ? closeSheet : undefined}
      />
    </div>
  );

  const guestsGroup = (
    <div className="bs-group">
      <p className="bs-label">Passengers</p>
      <GuestsContent
        variant="sheet"
        mode="tour"
        value={guests}
        onChange={setGuests}
        hints={FLIGHT_GUEST_HINTS}
        cabin={cabin}
        onCabinChange={setCabin}
      />
    </div>
  );

  if (variant === "results") {
    return (
      <div className="msearch msearch--results">
        <button
          type="button"
          className="msummary-btn"
          onClick={() => setSheet("all")}
        >
          <span className="msummary-text">{summaryText}</span>
        </button>

        {hint}

        <BottomSheet
          open={sheet === "all"}
          onClose={closeSheet}
          title={summaryText}
          footer={searchButton}
        >
          {routeGroup}
          {datesGroup}
          {guestsGroup}
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className="msearch msearch--home">
      <div className="mchips">
        <button
          type="button"
          className="mchip"
          onClick={() => setSheet("route")}
        >
          <span className="mchip-label">Route</span>
          <span className="mchip-value">{routeValue}</span>
        </button>
        <button
          type="button"
          className="mchip"
          onClick={() => setSheet("date")}
        >
          <span className="mchip-label">{isRound ? "Dates" : "When"}</span>
          <span className="mchip-value">{datesValue}</span>
        </button>
        <button
          type="button"
          className="mchip"
          onClick={() => setSheet("guests")}
        >
          <span className="mchip-label">Passengers</span>
          <span className="mchip-value">{guestsValue}</span>
        </button>
      </div>

      {searchButton}
      {hint}

      <BottomSheet open={sheet === "route"} onClose={closeSheet} title="Route">
        {routeGroup}
      </BottomSheet>

      <BottomSheet
        open={sheet === "date"}
        onClose={closeSheet}
        title={isRound ? "Dates" : "When"}
      >
        {datesGroup}
      </BottomSheet>

      <BottomSheet
        open={sheet === "guests"}
        onClose={closeSheet}
        title="Passengers"
      >
        {guestsGroup}
      </BottomSheet>
    </div>
  );
};

export default MobileFlightSearch;
