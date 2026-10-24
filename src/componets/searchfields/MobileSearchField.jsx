import "./mobileSearchBlock.css";

const MobileSearchField = ({
  icon,
  label,
  value,
  placeholder,
  trailing,
  onClick,
  className = "",
  ariaLabel,
}) => {
  const hasValue = Boolean(value);

  return (
    <button
      type="button"
      className={`msb-field ${className}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel || label || value || placeholder}
    >
      {icon ? <span className="msb-field__icon">{icon}</span> : null}
      <span className="msb-field__text">
        {label ? <span className="msb-field__label">{label}</span> : null}
        <span
          className={`msb-field__value${hasValue ? "" : " is-placeholder"}`}
        >
          {hasValue ? value : placeholder}
        </span>
      </span>
      {trailing ? <span className="msb-field__trailing">{trailing}</span> : null}
    </button>
  );
};

export default MobileSearchField;
