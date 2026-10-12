import { useState, useRef, useEffect } from "react";
import CalendarGrid from "./CalendarGrid";
import "./style.css";

/* Поле даты для туров: одна конкретная дата (mode="single") */
const DatePickerOne = ({ checkIn, onCheckInChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="dp-box">
      <p>When</p>
      <div className="dp-wrapper" ref={containerRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="dp">
          <span>
            {checkIn ? `${checkIn.toLocaleDateString()}` : "Select dates"}
          </span>
        </button>
        {isOpen && (
          <CalendarGrid
            mode="single"
            checkIn={checkIn}
            onCheckInChange={onCheckInChange}
            onDone={() => setIsOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default DatePickerOne;
