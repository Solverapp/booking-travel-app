import { useState, useRef, useEffect } from "react";
import GuestsContent from "./GuestsContent";
import { normalizeHotelGuests, guestsDisplayText } from "./guestsUtils";

/* Селектор гостей для отелей (попап внутри поля).
   Значение контролируется родителем (value) либо живёт локально,
   если value не передан. Счётчики — общий GuestsContent. */
const Questselector = ({ value, initialGuests, onGuestsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [innerValue, setInnerValue] = useState(() =>
    normalizeHotelGuests(initialGuests),
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
            mode="hotel"
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
