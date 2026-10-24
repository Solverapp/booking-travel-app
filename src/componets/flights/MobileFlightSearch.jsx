import { useState } from "react";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import KeyboardArrowDownOutlined from "@mui/icons-material/KeyboardArrowDownOutlined";
import BottomSheet from "../bottomsheet/BottomSheet";
import AirportPickerSheet from "./AirportPickerSheet";
import FlightDates from "./FlightDates";
import GuestsContent from "../quest/GuestsContent";
import MobileSearchField from "../searchfields/MobileSearchField";
import MobileDateRangeField from "../searchfields/MobileDateRangeField";
import { flightGuestsDisplayText } from "../quest/guestsUtils";
import { resolveSearchDates } from "../../utils/flightSearch";
import { formatShortDate } from "../../utils/dateFormat";
import revers from "../../img/icons/tabicons/arrow-2.svg";
import "../searchfields/style.css";
import "../searchfields/mobileSearchBlock.css";
import "./style.css";

const AIRPORT_HINT = "Select airports from the suggestions";
const FLIGHT_GUEST_HINTS = { adults: "", children: "Ages 2-11", infants: "Under 2" };

const airportValue = (airport) =>
  airport?.city || airport?.name || airport?.iata || "";

const MobileFlightSearch = ({
  variant = "home",
  initial,
  onSearch,
  searchDisabled = false,
  searchHint,
}) => {
  const [sheet, setSheet] = useState(null);
  const [routeField, setRouteField] = useState("from");
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
  const openRoute = (field) => {
    setRouteField(field);
    setSheet("route");
  };

  const isRound = tripType === "round";
  const departValue = formatShortDate(depart, { weekday: true });
  const returnValue = formatShortDate(returnDate, { weekday: true });
  const guestsValue = flightGuestsDisplayText(guests, cabin);

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

  return (
    <div
      className={`msearch msearch--stacked ${
        variant === "home" ? "msearch--home" : "msearch--results"
      }`}
    >
      <div className="msb">
        <div className="msb-route">
          <button
            type="button"
            className="msb-route__row"
            onClick={() => openRoute("from")}
            aria-label="Choose departure airport"
          >
            <span className="msb-field__icon">
              <LocationOnOutlined />
            </span>
            <span className="msb-field__text">
              <span
                className={`msb-field__value${
                  origin ? "" : " is-placeholder"
                }`}
              >
                {origin ? airportValue(origin) : "From"}
              </span>
            </span>
            {origin?.iata ? (
              <span className="msb-field__trailing">{origin.iata}</span>
            ) : null}
          </button>

          <button
            type="button"
            className="msb-route__row"
            onClick={() => openRoute("to")}
            aria-label="Choose arrival airport"
          >
            <span className="msb-field__icon">
              <LocationOnOutlined />
            </span>
            <span className="msb-field__text">
              <span
                className={`msb-field__value${
                  destination ? "" : " is-placeholder"
                }`}
              >
                {destination ? airportValue(destination) : "Where to?"}
              </span>
            </span>
            {destination?.iata ? (
              <span className="msb-field__trailing">{destination.iata}</span>
            ) : null}
          </button>

          <button
            type="button"
            className="msb-swap"
            aria-label="Swap airports"
            onClick={handleSwap}
          >
            <img src={revers} alt="" />
          </button>
        </div>

        <MobileDateRangeField
          icon={<CalendarMonthOutlined />}
          startValue={departValue}
          endValue={returnValue}
          startPlaceholder="Depart"
          endPlaceholder="Return"
          endText="One way"
          endDisabled={!isRound}
          showClear
          onOpen={() => setSheet("date")}
          onClear={() => {
            setDepart(null);
            setReturnDate(null);
          }}
          ariaLabel="Choose flight dates"
        />

        <MobileSearchField
          icon={<PersonOutlineOutlined />}
          value={guestsValue}
          trailing={<KeyboardArrowDownOutlined />}
          onClick={() => setSheet("guests")}
          ariaLabel="Choose passengers and cabin"
        />

        <button
          type="button"
          className="msb-btn"
          disabled={disabled}
          onClick={runSearch}
        >
          Search
        </button>

        {hintText ? <p className="msb-hint">{hintText}</p> : null}
      </div>

      <BottomSheet
        open={sheet === "route"}
        onClose={closeSheet}
        variant="airport"
        showHandle={false}
        showTitle={false}
        ariaLabel="Choose airports"
      >
        <AirportPickerSheet
          key={`route-${routeField}`}
          open={sheet === "route"}
          field={routeField}
          origin={origin}
          destination={destination}
          onFieldChange={setRouteField}
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onClose={closeSheet}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "date"}
        onClose={closeSheet}
        title="Dates"
        variant="search"
        showHandle={false}
      >
        <FlightDates
          variant="sheet"
          tripType={tripType}
          onTripTypeChange={setTripType}
          depart={depart}
          returnDate={returnDate}
          onDepartChange={setDepart}
          onReturnChange={setReturnDate}
          onDone={closeSheet}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "guests"}
        onClose={closeSheet}
        title="Passengers"
        variant="search"
        showHandle={false}
        footer={
          <button type="button" className="msb-sheet-done" onClick={closeSheet}>
            Done
          </button>
        }
      >
        <GuestsContent
          variant="sheet"
          mode="tour"
          value={guests}
          onChange={setGuests}
          hints={FLIGHT_GUEST_HINTS}
          cabin={cabin}
          onCabinChange={setCabin}
        />
      </BottomSheet>
    </div>
  );
};

export default MobileFlightSearch;
