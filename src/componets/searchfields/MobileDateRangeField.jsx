import CloseOutlined from "@mui/icons-material/CloseOutlined";
import "./mobileSearchBlock.css";

const MobileDateRangeField = ({
  icon,
  startValue,
  endValue,
  startPlaceholder = "Select date",
  endPlaceholder = "Select date",
  endText = "One way",
  endDisabled = false,
  showClear = false,
  onOpen,
  onClear,
  ariaLabel = "Select dates",
  className = "",
}) => {
  const hasClear = showClear && Boolean(startValue || endValue);

  const handleKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen?.();
  };

  return (
    <div
      className={`msb-date${className ? ` ${className}` : ""}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
    >
      {icon ? <span className="msb-date__icon">{icon}</span> : null}
      <span className="msb-date__cells">
        <span
          className={`msb-date__cell msb-date__cell--start${
            hasClear ? " has-clear" : ""
          }`}
        >
          <span className={startValue ? "" : "is-placeholder"}>
            {startValue || startPlaceholder}
          </span>
          {hasClear ? (
            <button
              type="button"
              className="msb-date__clear"
              onClick={(event) => {
                event.stopPropagation();
                onClear?.();
              }}
              aria-label="Clear dates"
            >
              <CloseOutlined fontSize="inherit" />
            </button>
          ) : null}
        </span>
        <span className="msb-date__divider" aria-hidden="true" />
        <span
          className={`msb-date__cell${endDisabled ? " is-disabled" : ""}`}
        >
          <span className={endValue && !endDisabled ? "" : "is-placeholder"}>
            {endDisabled ? endText : endValue || endPlaceholder}
          </span>
        </span>
      </span>
    </div>
  );
};

export default MobileDateRangeField;
