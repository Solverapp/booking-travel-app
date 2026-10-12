import { useState, useRef, useEffect } from "react";
import GuestsContent from "../quest/GuestsContent";
import { normalizeTourGuests, guestsDisplayText } from "../quest/guestsUtils";

/* Селектор гостей для туров (попап внутри поля): взрослые / дети / младенцы.
   Значение контролируется родителем (value) либо живёт локально. */
const Questselector = ({ value, initialGuests, onGuestsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [innerValue, setInnerValue] = useState(() =>
    normalizeTourGuests(initialGuests),
  );
  const containerRef = useRef(null);

  const guests = value ?? innerValue;

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (next) => {
    if (value === undefined) {
      setInnerValue(next);
    }
    onGuestsChange?.(next);
  };

  return (
    <div className="dp-box">
      <p>Guests</p>
      <div className="qb-wrapper" ref={containerRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="dp">
          <span>{guestsDisplayText(guests)}</span>
        </button>
        {isOpen && (
          <GuestsContent
            mode="tour"
            value={guests}
            onChange={handleChange}
            onDone={() => setIsOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Questselector;
