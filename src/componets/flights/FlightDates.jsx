import { useState, useRef, useEffect } from "react";
import CalendarGrid from "../datepicker/CalendarGrid";
import "./style.css";

/* Даты рейса: One way / Round trip + Depart/Return.
   variant="popup" — две ячейки с календарём-попапом (десктоп),
   variant="sheet" — тоггл + календарь в потоке (нижняя шторка). */
const FlightDates = ({
  tripType = "oneway",
  onTripTypeChange,
  depart,
  returnDate,
  onDepartChange,
  onReturnChange,
  onDone,
  variant = "popup",
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (variant !== "popup") return;
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variant]);

  const isRound = tripType === "round";
  const fmt = (date) => (date ? date.toLocaleDateString() : null);

  const handleTripChange = (nextTrip) => {
    onTripTypeChange?.(nextTrip);
    if (nextTrip === "oneway") onReturnChange?.(null);
  };

  const toggle = (
    <div className="ftrip-toggle">
      <button
        type="button"
        className={`ftrip-btn ${!isRound ? "is-active" : ""}`}
        onClick={() => handleTripChange("oneway")}
      >
        One way
      </button>
      <button
        type="button"
        className={`ftrip-btn ${isRound ? "is-active" : ""}`}
        onClick={() => handleTripChange("round")}
      >
        Round trip
      </button>
    </div>
  );

  if (variant === "sheet") {
    return (
      <div className="fdate-sheet">
        {toggle}
        <CalendarGrid
          variant="sheet"
          mode={isRound ? "range" : "single"}
          checkIn={depart}
          checkOut={isRound ? returnDate : null}
          onCheckInChange={onDepartChange}
          onCheckOutChange={onReturnChange}
          onDone={onDone}
        />
      </div>
    );
  }

  return (
    <div className="sop-box-dpicker">
      <div className="dpicker-checkin">
        <p>Depart</p>
        <div className="dp-wrapper" ref={ref}>
          <button type="button" className="dp" onClick={() => setOpen(!open)}>
            <span>{fmt(depart) || "Select date"}</span>
          </button>
          {open && (
            <div className="fdate-popup">
              {toggle}
              <CalendarGrid
                variant="sheet"
                mode={isRound ? "range" : "single"}
                checkIn={depart}
                checkOut={isRound ? returnDate : null}
                onCheckInChange={onDepartChange}
                onCheckOutChange={onReturnChange}
                onDone={() => setOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
      <div className={`dpicker-checout ${isRound ? "" : "is-disabled"}`}>
        <p>Return</p>
        <div className="dp-wrapper">
          <button
            type="button"
            className="dp"
            onClick={() => {
              if (isRound) setOpen(true);
            }}
          >
            <span>{isRound ? fmt(returnDate) || "Select date" : "One way"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlightDates;
