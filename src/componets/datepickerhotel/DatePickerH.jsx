import { useState, useRef, useEffect } from "react";
import CalendarGrid from "../datepicker/CalendarGrid";
import "./style.css";

/* Поле дат для отелей: диапазон check-in → check-out (mode="range") */
const DatePickerH = ({
  checkInH,
  checkOutH,
  onCheckInChangeH,
  onCheckOutChangeH,
}) => {
  const [isOpenH, setIsOpenH] = useState(false);
  const containerRefH = useRef(null);

  useEffect(() => {
    function handleClickOutsideH(event) {
      if (
        containerRefH.current &&
        !containerRefH.current.contains(event.target)
      ) {
        setIsOpenH(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideH);
    return () => document.removeEventListener("mousedown", handleClickOutsideH);
  }, []);

  return (
    <div className="sop-box-dpicker">
      <div className="dpicker-checkin">
        <p>Check-in</p>
        <div className="dp-wrapper" ref={containerRefH}>
          <button
            type="button"
            onClick={() => setIsOpenH(!isOpenH)}
            className="dp"
          >
            <span>
              {checkInH ? checkInH.toLocaleDateString() : "Select dates"}
            </span>
          </button>
          {isOpenH && (
            <CalendarGrid
              mode="range"
              checkIn={checkInH}
              checkOut={checkOutH}
              onCheckInChange={onCheckInChangeH}
              onCheckOutChange={onCheckOutChangeH}
              onDone={() => setIsOpenH(false)}
            />
          )}
        </div>
      </div>
      <div className="dpicker-checout">
        <p>Check-out</p>
        <span>
          {checkOutH ? checkOutH.toLocaleDateString() : "Select dates"}
        </span>
      </div>
    </div>
  );
};

export default DatePickerH;
