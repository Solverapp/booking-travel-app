import { useRef, useState } from "react";
import CalendarGrid from "../datepicker/CalendarGrid";
import AnchoredPopover from "../searchfields/AnchoredPopover";
import "./style.css";

const DatePickerH = ({
  checkInH,
  checkOutH,
  onCheckInChangeH,
  onCheckOutChangeH,
}) => {
  const [isOpenH, setIsOpenH] = useState(false);
  const containerRefH = useRef(null);

  const handleClear = () => {
    onCheckInChangeH?.(null);
    onCheckOutChangeH?.(null);
  };

  return (
    <div className="sop-box-dpicker" ref={containerRefH}>
      <div className="dpicker-checkin">
        <p>Check-in</p>
        <button
          type="button"
          onClick={() => setIsOpenH(true)}
          className="dp"
        >
          <span>
            {checkInH ? checkInH.toLocaleDateString() : "Select dates"}
          </span>
        </button>
      </div>
      <div className="dpicker-checout">
        <p>Check-out</p>
        <button
          type="button"
          onClick={() => setIsOpenH(true)}
          className="dp"
        >
          <span>
            {checkOutH ? checkOutH.toLocaleDateString() : "Select dates"}
          </span>
        </button>
      </div>

      <AnchoredPopover
        open={isOpenH}
        anchorRef={containerRefH}
        onClose={() => setIsOpenH(false)}
        preferredWidth={704}
        allowOverlap
        ariaLabel="Choose hotel dates"
      >
        <CalendarGrid
          variant="plain"
          mode="range"
          monthCount={2}
          checkIn={checkInH}
          checkOut={checkOutH}
          onCheckInChange={onCheckInChangeH}
          onCheckOutChange={onCheckOutChangeH}
        />
        <div className="date-popover__footer">
          <button
            type="button"
            className="date-popover__btn date-popover__btn--clear"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="date-popover__btn date-popover__btn--apply"
            onClick={() => setIsOpenH(false)}
          >
            Apply
          </button>
        </div>
      </AnchoredPopover>
    </div>
  );
};

export default DatePickerH;
