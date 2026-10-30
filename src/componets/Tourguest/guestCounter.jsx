import { useEffect, useRef } from "react";
import { Add, Remove } from "@mui/icons-material";
import "./style.css";

const RateConter = ({
  onRoomChange,
  count = 10,
  rateCount = 0,
  price,
  id,
  type,
  disabled = false,
}) => {
  const onRoomChangeRef = useRef(onRoomChange);
  const minCount = type === "adult" ? 1 : 0;
  const safeCount = Math.min(
    Math.max(Number(rateCount) || 0, minCount),
    count,
  );

  useEffect(() => {
    onRoomChangeRef.current = onRoomChange;
  }, [onRoomChange]);

  useEffect(() => {
    if (typeof onRoomChangeRef.current === "function") {
      const total = safeCount * price;
      onRoomChangeRef.current(safeCount, price, total, type);
    }
  }, [safeCount, price, type]);

  const setCount = (next) => {
    if (disabled || typeof onRoomChangeRef.current !== "function") return;
    const bounded = Math.min(Math.max(next, minCount), count);
    if (bounded === safeCount) return;
    onRoomChangeRef.current(bounded, price, bounded * price, type);
  };

  return (
    <div
      className={`tour-stepper tour-stepper--${type || "adult"}`}
      id={id}
    >
      <button
        type="button"
        className="tour-stepper-btn"
        onClick={() => setCount(safeCount - 1)}
        disabled={disabled || safeCount <= minCount}
        aria-label="Decrease guests"
      >
        <Remove />
      </button>
      <span className="tour-stepper-value" aria-live="polite">
        {safeCount}
      </span>
      <button
        type="button"
        className="tour-stepper-btn tour-stepper-btn--plus"
        onClick={() => setCount(safeCount + 1)}
        disabled={disabled || safeCount >= count}
        aria-label="Increase guests"
      >
        <Add />
      </button>
    </div>
  );
};

export default RateConter;
