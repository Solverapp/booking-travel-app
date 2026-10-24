import { useRef, useState } from "react";
import CalendarGrid from "../datepicker/CalendarGrid";
import AnchoredPopover from "../searchfields/AnchoredPopover";
import "./style.css";

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
    <div className="sop-box-dpicker" ref={ref}>
      <div className="dpicker-checkin">
        <p>Depart</p>
        <button type="button" className="dp" onClick={() => setOpen(true)}>
          <span>{fmt(depart) || "Select date"}</span>
        </button>
      </div>
      <div className={`dpicker-checout ${isRound ? "" : "is-disabled"}`}>
        <p>Return</p>
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

      <AnchoredPopover
        open={open}
        anchorRef={ref}
        onClose={() => setOpen(false)}
        preferredWidth={420}
        allowOverlap
        ariaLabel="Choose flight dates"
      >
        <div className="fdate-popover">
          {toggle}
          <CalendarGrid
            variant="plain"
            mode={isRound ? "range" : "single"}
            checkIn={depart}
            checkOut={isRound ? returnDate : null}
            onCheckInChange={onDepartChange}
            onCheckOutChange={onReturnChange}
          />
          <div className="date-popover__footer">
            <button
              type="button"
              className="date-popover__btn date-popover__btn--clear"
              onClick={() => {
                onDepartChange?.(null);
                onReturnChange?.(null);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="date-popover__btn date-popover__btn--apply"
              onClick={() => setOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      </AnchoredPopover>
    </div>
  );
};

export default FlightDates;
