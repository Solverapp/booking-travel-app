import { useState, useRef, useEffect } from "react";
import arrLeft from "../../img/icons/tabicons/arrow-left.svg";
import arrRigth from "../../img/icons/tabicons/arrow-right.svg";
import "./style.css";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DatePickerH = ({
  checkInH,
  checkOutH,
  onCheckInChangeH,
  onCheckOutChangeH,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingCheckOutH, setSelectingCheckOutH] = useState(false);
  const [isOpenH, setIsOpenH] = useState(false);
  const containerRefH = useRef(null);

  // Синхронизируем currentMonth с выбранной датой
  useEffect(() => {
    if (checkInH) {
      setCurrentMonth(new Date(checkInH.getFullYear(), checkInH.getMonth()));
    } else {
      setCurrentMonth(new Date());
    }
  }, [checkInH]);

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

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const isSameDayH = (date1, date2) => {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isInRangeH = (day) => {
    if (!checkInH || !checkOutH) return false;
    const currentDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    return currentDate > checkInH && currentDate < checkOutH;
  };

  const getButtonClassH = (day) => {
    const currentDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (currentDate < today) {
      return "disabled";
    }

    if (isSameDayH(currentDate, checkInH)) return "check-in";
    if (isSameDayH(currentDate, checkOutH)) return "check-out";
    if (isInRangeH(day)) return "in-range";
    return "";
  };

  const handleDateClickH = (day) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );

    if (!checkInH) {
      // Если дата заезда не выбрана - выбираем её
      onCheckInChangeH(selectedDate);
      setSelectingCheckOutH(true);
    } else if (!checkOutH) {
      // Если дата заезда выбрана, но отъезда нет
      if (selectedDate > checkInH) {
        // Если выбранная дата позже даты заезда
        onCheckOutChangeH(selectedDate);
        setSelectingCheckOutH(false);
        setIsOpenH(false);
      } else {
        // Если выбрали дату раньше или равную дате заезда - переустанавливаем дату заезда
        onCheckInChangeH(selectedDate);
      }
    } else {
      // Обе даты выбраны - начинаем заново с даты заезда
      onCheckInChangeH(selectedDate);
      onCheckOutChangeH(null);
      setSelectingCheckOutH(true);
    }
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);

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
            <div className="date-wrapper">
              <div className="month">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1,
                      ),
                    )
                  }
                >
                  <img src={arrLeft} alt="prev" />
                </button>
                <span>
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                      ),
                    )
                  }
                >
                  <img src={arrRigth} alt="next" />
                </button>
              </div>

              {/* <div className="status-text">
                {!checkInH && <p>Select check-in date</p>}
                {checkInH && !checkOutH && <p>Select check-out date</p>}
              </div> */}

              <div className="dp-days">
                <div className="wekday">
                  {DAYS.map((day) => (
                    <div key={day} className="wekday-block">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="days">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`}></div>
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => (
                    <button
                      key={i + 1}
                      type="button"
                      onClick={() => handleDateClickH(i + 1)}
                      className={getButtonClassH(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
