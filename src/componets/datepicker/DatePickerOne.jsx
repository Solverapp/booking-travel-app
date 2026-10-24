import { useRef, useState } from "react";
import CalendarGrid from "./CalendarGrid";
import AnchoredPopover from "../searchfields/AnchoredPopover";
import "./style.css";

const DatePickerOne = ({ checkIn, onCheckInChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  return (
    <div className="dp-box" ref={containerRef}>
      <p>When</p>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="dp"
      >
        <span>{checkIn ? checkIn.toLocaleDateString() : "Select date"}</span>
      </button>

      <AnchoredPopover
        open={isOpen}
        anchorRef={containerRef}
        onClose={() => setIsOpen(false)}
        preferredWidth={348}
        allowOverlap
        ariaLabel="Choose tour date"
      >
        <CalendarGrid
          variant="plain"
          mode="single"
          checkIn={checkIn}
          onCheckInChange={onCheckInChange}
        />
        <div className="date-popover__footer">
          <button
            type="button"
            className="date-popover__btn date-popover__btn--clear"
            onClick={() => onCheckInChange?.(null)}
          >
            Clear
          </button>
          <button
            type="button"
            className="date-popover__btn date-popover__btn--apply"
            onClick={() => setIsOpen(false)}
          >
            Apply
          </button>
        </div>
      </AnchoredPopover>
    </div>
  );
};

export default DatePickerOne;
