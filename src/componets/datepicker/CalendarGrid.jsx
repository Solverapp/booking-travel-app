import { useState } from "react";
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

/* Единая сетка календаря.
   mode="single" — туры (один клик = дата),
   mode="range"  — отели (check-in → check-out).
   variant="popup" — внутри поля (date-wrapper, absolute),
   variant="sheet" — контент нижней шторки (статичный, во всю ширину).
   Состояние дат живёт у родителя; здесь только отображаемый месяц. */
const CalendarGrid = ({
  mode = "single",
  checkIn = null,
  checkOut = null,
  onCheckInChange,
  onCheckOutChange,
  onDone,
  variant = "popup",
  monthCount = 1,
}) => {
  const [month, setMonth] = useState(() =>
    checkIn ? new Date(checkIn.getFullYear(), checkIn.getMonth()) : new Date(),
  );

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const m = date.getMonth();
    const firstDay = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
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

  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getButtonClass = (currentDate) => {
    if (isPast(currentDate)) return "disabled";

    if (mode === "single") {
      return isSameDay(currentDate, checkIn) ? "checkin" : "";
    }

    if (isSameDay(currentDate, checkIn)) return "check-in";
    if (isSameDay(currentDate, checkOut)) return "check-out";
    if (checkIn && checkOut && currentDate > checkIn && currentDate < checkOut) {
      return "in-range";
    }
    return "";
  };

  const handleSingleClick = (date) => {
    onCheckInChange?.(date);
    onDone?.();
  };

  const handleRangeClick = (selectedDate) => {
    if (!checkIn) {
      onCheckInChange?.(selectedDate);
      return;
    }

    if (!checkOut) {
      if (selectedDate > checkIn) {
        onCheckOutChange?.(selectedDate);
        onDone?.();
      } else {
        // Выбрали раньше или тот же день — переустанавливаем check-in
        onCheckInChange?.(selectedDate);
      }
      return;
    }

    // Обе даты выбраны — начинаем заново
    onCheckInChange?.(selectedDate);
    onCheckOutChange?.(null);
  };

  const handleDayClick = (date) => {
    if (mode === "single") handleSingleClick(date);
    else handleRangeClick(date);
  };

  const stepMonth = (delta) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  const months = Array.from(
    { length: monthCount },
    (_, index) => new Date(month.getFullYear(), month.getMonth() + index, 1),
  );

  return (
    <div
      className={`${
        variant === "sheet"
          ? "calendar-sheet"
          : variant === "plain"
            ? "calendar-plain"
            : "date-wrapper"
      }${monthCount > 1 ? " calendar-multi" : ""}`}
    >
      <div className="calendar-months">
        {months.map((monthDate, index) => {
          const { firstDay, daysInMonth } = getDaysInMonth(monthDate);
          const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;

          return (
            <div className="calendar-month" key={monthKey}>
              <div className="month">
                {index === 0 ? (
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => stepMonth(-1)}
                  >
                    <img src={arrLeft} alt="prev" />
                  </button>
                ) : (
                  <span className="month__spacer" aria-hidden="true" />
                )}
                <span>
                  {MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
                </span>
                {index === months.length - 1 ? (
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => stepMonth(1)}
                  >
                    <img src={arrRigth} alt="next" />
                  </button>
                ) : (
                  <span className="month__spacer" aria-hidden="true" />
                )}
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
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const date = new Date(
                      monthDate.getFullYear(),
                      monthDate.getMonth(),
                      i + 1,
                    );
                    return (
                      <button
                        key={i + 1}
                        type="button"
                        onClick={() => handleDayClick(date)}
                        className={getButtonClass(date)}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
