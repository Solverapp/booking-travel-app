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

const DatePickerOne = ({
  checkIn,
  onCheckInChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);
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

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  

  const getButtonClass = (day) => {
    const currentDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Если дата в прошлом - disabled
    if (currentDate < today) {
      return "disabled";
    }

    if (isSameDay(currentDate, checkIn)) return "checkin";
    return "";
  };

  const handleDateClick = (day) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    onCheckInChange(selectedDate);
    setSelectingCheckOut(false);
      setIsOpen(false);

  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);

  return (
    <div className="dp-box">
      <p>When</p>
      <div className="dp-wrapper" ref={containerRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="dp">
          <span>
            {checkIn 
              ? `${checkIn.toLocaleDateString()}`
              : "Select dates"}
          </span>
        </button>
        {isOpen && (
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
                    onClick={() => handleDateClick(i + 1)}
                    className={getButtonClass(i + 1)}
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
  );
};

export default DatePickerOne;
