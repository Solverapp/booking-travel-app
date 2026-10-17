import { useState } from "react";
import FilterCheckbox from "../hotelFilters/FilterCheckbox";
import { FLIGHT_TIME_SLOTS } from "../../utils/flightSearch";
import checked from "../../img/icons/tabicons/tick-circle.svg";
import "../hotelFilters/style.css";
import "./style.css";

const STOP_OPTIONS = [
  { id: "direct", label: "Direct" },
  { id: "one", label: "1 stop" },
  { id: "two_plus", label: "2+ stops" },
];

const MAX_VISIBLE_AIRLINES = 6;

const toggleInArray = (list, value) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

const FlightFilters = ({ filters, onChange, onClear, airlines }) => {
  const [showAllAirlines, setShowAllAirlines] = useState(false);
  const visibleAirlines = showAllAirlines
    ? airlines
    : airlines.slice(0, MAX_VISIBLE_AIRLINES);

  const toggle = (key, value) =>
    onChange({ ...filters, [key]: toggleInArray(filters[key], value) });
  const setField = (key, value) => onChange({ ...filters, [key]: value });

  const renderPills = (key, options) => (
    <div className="fb-rating-box">
      {options.map((option) => {
        const isActive = filters[key].includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(key, option.id)}
            className={`rating-btn ${isActive ? "rating-btn-active" : ""}`}
          >
            <span>{option.label}</span>
            {isActive && <img src={checked} alt="" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="filter-box">
      <div className="fb-heder">
        <h3>Filters</h3>
        <button type="button" onClick={onClear}>
          Clear all
        </button>
      </div>

      <div className="fb-price">
        <h4>Price, AED</h4>
        <div className="price-box">
          <div className="min">
            <span className="regular">Min</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={filters.priceMin}
              onChange={(e) => setField("priceMin", e.target.value)}
            />
          </div>
          <div className="max">
            <span className="regular">Max</span>
            <input
              type="number"
              min="0"
              placeholder="Any"
              value={filters.priceMax}
              onChange={(e) => setField("priceMax", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="fb-rating">
        <div className="rating-heder">
          <h4>Stops</h4>
          <span className="regular">Stops on the way to your destination</span>
        </div>
        {renderPills("stops", STOP_OPTIONS)}
      </div>

      {airlines.length > 0 && (
        <div className="fb-amenities">
          <h4>Airlines</h4>
          {visibleAirlines.map((airline) => (
            <FilterCheckbox
              key={airline.code}
              label={airline.name}
              isChecked={filters.airlines.includes(airline.code)}
              onChange={() => toggle("airlines", airline.code)}
            />
          ))}

          {airlines.length > MAX_VISIBLE_AIRLINES && (
            <button
              type="button"
              className="fb-showall"
              onClick={() => setShowAllAirlines((value) => !value)}
            >
              {showAllAirlines
                ? "Show less"
                : `Show all (${airlines.length})`}
            </button>
          )}
        </div>
      )}

      <div className="fb-rating">
        <div className="rating-heder">
          <h4>Departure time</h4>
          <span className="regular">Outbound flight departure</span>
        </div>
        {renderPills("departTime", FLIGHT_TIME_SLOTS)}
      </div>

      <div className="fb-rating">
        <div className="rating-heder">
          <h4>Arrival time</h4>
          <span className="regular">Outbound flight arrival</span>
        </div>
        {renderPills("arriveTime", FLIGHT_TIME_SLOTS)}
      </div>

      <div className="fb-amenities">
        <h4>Baggage</h4>
        <FilterCheckbox
          label="Hand baggage included"
          isChecked={filters.handBaggage}
          onChange={() => setField("handBaggage", !filters.handBaggage)}
        />
        <FilterCheckbox
          label="Checked baggage included"
          isChecked={filters.checkedBaggage}
          onChange={() => setField("checkedBaggage", !filters.checkedBaggage)}
        />
      </div>

      <div className="fb-amenities">
        <h4>Conditions</h4>
        <FilterCheckbox
          label="Refundable only"
          isChecked={filters.refundableOnly}
          onChange={() => setField("refundableOnly", !filters.refundableOnly)}
        />
      </div>
    </div>
  );
};

export default FlightFilters;
