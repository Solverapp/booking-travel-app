import { useState } from "react";
import AirportSearch from "./AirportSearch";
import FlightDates from "./FlightDates";
import FlightGuests from "./FlightGuests";
import { resolveSearchDates } from "../../utils/flightSearch";
import revers from "../../img/icons/tabicons/arrow-2.svg";
import sbtn from "../../img/icons/tabicons/search.svg";
import "./style.css";

const AIRPORT_HINT = "Select airports from the suggestions";

/* Десктоп-форма перелётов (главная + панель Modify на /flights).
   Значения — внутренний стейт; initial — стартовые (с /flights),
   onSearch(values) отдаёт готовые значения (строки дат) родителю. */
const FlightSearchForm = ({ initial, onSearch }) => {
  const [origin, setOrigin] = useState(initial?.origin ?? null);
  const [destination, setDestination] = useState(initial?.destination ?? null);
  const [tripType, setTripType] = useState(initial?.tripType ?? "round");
  const [depart, setDepart] = useState(initial?.depart ?? null);
  const [returnDate, setReturnDate] = useState(initial?.returnDate ?? null);
  const [guests, setGuests] = useState(
    initial?.guests ?? { adults: 1, children: 0, infants: 0 },
  );
  const [cabin, setCabin] = useState(initial?.cabin ?? "all");

  const canSearch = Boolean(origin?.iata && destination?.iata);

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = () => {
    if (!canSearch) return;
    const dates = resolveSearchDates({ tripType, depart, returnDate });
    onSearch?.({ origin, destination, tripType, ...dates, guests, cabin });
  };

  return (
    <>
      <div className="s-optiontour">
        <div className="sop-box-search-air">
          <AirportSearch
            label="From"
            value={origin}
            onSelect={setOrigin}
            onEdit={() => setOrigin(null)}
          />
          <button
            type="button"
            className="air-item-revers"
            aria-label="Swap airports"
            onClick={handleSwap}
          >
            <img src={revers} alt="" />
          </button>
          <AirportSearch
            label="To"
            value={destination}
            onSelect={setDestination}
            onEdit={() => setDestination(null)}
          />
        </div>
        <FlightDates
          tripType={tripType}
          onTripTypeChange={setTripType}
          depart={depart}
          returnDate={returnDate}
          onDepartChange={setDepart}
          onReturnChange={setReturnDate}
        />
        <FlightGuests
          value={guests}
          onChange={setGuests}
          cabin={cabin}
          onCabinChange={setCabin}
        />
        <div
          className={`sop-btn${canSearch ? "" : " is-disabled"}`}
          aria-disabled={!canSearch}
          onClick={handleSearch}
        >
          <img src={sbtn} alt="" />
          <span>Search</span>
        </div>
      </div>
      {!canSearch && <p className="s-hint">{AIRPORT_HINT}</p>}
    </>
  );
};

export default FlightSearchForm;
