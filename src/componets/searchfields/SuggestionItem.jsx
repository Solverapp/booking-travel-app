import CheckCircle from "@mui/icons-material/CheckCircle";
import "./searchUi.css";

const SuggestionItem = ({
  icon,
  title,
  subtitle,
  selected = false,
  trailing,
  iconVariant = "plain",
  onClick,
  className = "",
  ariaLabel,
}) => (
  <button
    type="button"
    className={`sug-item ${className}`.trim()}
    onClick={onClick}
    aria-pressed={selected}
    aria-label={ariaLabel}
  >
    {icon ? (
      <span className={`sug-item__icon sug-item__icon--${iconVariant}`}>{icon}</span>
    ) : null}
    <span className="sug-item__body">
      <span className="sug-item__title">{title}</span>
      {subtitle ? <span className="sug-item__subtitle">{subtitle}</span> : null}
    </span>
    <span className="sug-item__end">
      {trailing ? <span>{trailing}</span> : null}
      {selected ? <CheckCircle className="sug-item__check" fontSize="small" /> : null}
    </span>
  </button>
);

export default SuggestionItem;
