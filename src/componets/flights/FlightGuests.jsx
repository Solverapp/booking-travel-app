import { useState, useRef, useEffect } from "react";
import GuestsContent from "../quest/GuestsContent";
import { guestsDisplayText } from "../quest/guestsUtils";
import "./style.css";

/* Пассажиры рейса (взрослые / дети / младенцы + класс) — попап в поле.
   Значение контролируется родителем. */
const FLIGHT_HINTS = { adults: "", children: "Ages 2-11", infants: "Under 2" };

const FlightGuests = ({ value, onChange, cabin, onCabinChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const guests = value ?? { adults: 1, children: 0, infants: 0 };

  return (
    <div className="dp-box">
      <p>Passengers</p>
      <div className="qb-wrapper" ref={ref}>
        <button type="button" className="dp" onClick={() => setOpen(!open)}>
          <span>{guestsDisplayText(guests)}</span>
        </button>
        {open && (
          <GuestsContent
            mode="tour"
            value={guests}
            onChange={onChange}
            hints={FLIGHT_HINTS}
            cabin={cabin}
            onCabinChange={onCabinChange}
            onDone={() => setOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default FlightGuests;
