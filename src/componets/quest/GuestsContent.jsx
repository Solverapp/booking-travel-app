import minus from "../../img/icons/tabicons/minus.svg";
import plus from "../../img/icons/tabicons/plus.svg";
import { MAX_GUESTS } from "./guestsUtils";
import "./guests.css";

/* Счётчики гостей — общий контент.
   mode="hotel"  — отели: взрослые / дети + возрасты детей,
   mode="tour"   — туры: взрослые / дети / младенцы.
   variant="popup" — внутри поля (absolute-попап с кнопкой Done),
   variant="sheet" — контент нижней шторки (во всю ширину).
   hints — переопределение подсказок (пустая строка убирает подсказку).
   cabin/onCabinChange — блок выбора класса обслуживания (flights).
   Компонент контролируемый: значение приходит снаружи (value/onChange). */
const CABIN_OPTIONS = [
  { id: "all", label: "All cabins" },
  { id: "economy", label: "Economy" },
  { id: "business", label: "Business" },
  { id: "first", label: "First class" },
];

const GuestsContent = ({
  mode = "hotel",
  variant = "popup",
  value,
  onChange,
  onDone,
  hints,
  cabin = "all",
  onCabinChange,
}) => {
  const isTour = mode === "tour";

  const adults = value?.adults ?? 1;
  const children = value?.children ?? 0;
  const infants = value?.infants ?? 0;
  const childrenAges = Array.isArray(value?.childrenAges)
    ? value.childrenAges
    : [];

  const total = adults + children + infants;
  const canAdd = total < MAX_GUESTS;

  const emit = (patch) => {
    if (!onChange) return;
    if (isTour) {
      onChange({ adults, children, infants, ...patch });
    } else {
      onChange({ adults, children, childrenAges, ...patch });
    }
  };

  const handleAdults = (delta) => {
    if (delta > 0) {
      if (!canAdd) return;
      emit({ adults: adults + 1 });
    } else if (adults > 1) {
      emit({ adults: adults - 1 });
    }
  };

  const handleChildren = (delta) => {
    if (delta > 0) {
      if (!canAdd) return;
      if (isTour) {
        emit({ children: children + 1 });
      } else {
        emit({ children: children + 1, childrenAges: [...childrenAges, 5] });
      }
    } else {
      if (children === 0) return;
      const nextChildren = children - 1;
      if (isTour) {
        emit({ children: nextChildren });
      } else {
        emit({
          children: nextChildren,
          childrenAges: childrenAges.slice(0, nextChildren),
        });
      }
    }
  };

  const handleInfants = (delta) => {
    if (delta > 0) {
      if (!canAdd) return;
      emit({ infants: infants + 1 });
    } else if (infants > 0) {
      emit({ infants: infants - 1 });
    }
  };

  const handleAgeChange = (index, age) => {
    const nextAges = [...childrenAges];
    nextAges[index] = age;
    emit({ childrenAges: nextAges });
  };

  const hintOf = (key, fallback) => hints?.[key] ?? fallback;

  const renderCounter = ({ label, hint, count, onMinus, onPlus, minusDisabled, plusDisabled }) => (
    <div className="selector-item">
      <div className="item-left">
        <p>{label}</p>
        {hint ? <span>{hint}</span> : null}
      </div>
      <div className="item-counter">
        <button
          type="button"
          className="counter-btn"
          onClick={onMinus}
          disabled={minusDisabled}
          aria-label={`Remove ${label}`}
        >
          <img src={minus} alt="" />
        </button>
        <p>{count}</p>
        <button
          type="button"
          className="counter-btn"
          onClick={onPlus}
          disabled={plusDisabled}
          aria-label={`Add ${label}`}
        >
          <img src={plus} alt="" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`${
        variant === "sheet" ? "gcontent gcontent-sheet" : "gcontent gcontent-popup"
      }${hints ? " gcontent-inline-hints" : ""}`}
    >
      <div className="selector-box">
        {renderCounter({
          label: "Adults",
          hint: hintOf("adults", "18+ years"),
          count: adults,
          onMinus: () => handleAdults(-1),
          onPlus: () => handleAdults(1),
          minusDisabled: adults === 1,
          plusDisabled: !canAdd,
        })}

        {renderCounter({
          label: "Children",
          hint: hintOf("children", "2–12 years"),
          count: children,
          onMinus: () => handleChildren(-1),
          onPlus: () => handleChildren(1),
          minusDisabled: children === 0,
          plusDisabled: !canAdd,
        })}

        {isTour &&
          renderCounter({
            label: "Infants",
            hint: hintOf("infants", "0–2 years"),
            count: infants,
            onMinus: () => handleInfants(-1),
            onPlus: () => handleInfants(1),
            minusDisabled: infants === 0,
            plusDisabled: !canAdd,
          })}

        {!isTour && children > 0 && (
          <div className="selector-ages">
            <div className="ages-left">
              <span>Select Children ages</span>
            </div>

            {Array.from({ length: children }).map((_, idx) => (
              <div key={idx} className="ages-box">
                <span>Child {idx + 1} age:</span>
                <select
                  className="age-select"
                  value={childrenAges[idx] ?? 5}
                  onChange={(e) => handleAgeChange(idx, parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: 18 }, (_, i) => i).map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {onCabinChange && (
          <div className="cabin-box">
            <p className="cabin-label">Cabin class</p>
            <div className="cabin-pills">
              {CABIN_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`cabin-pill${cabin === option.id ? " is-active" : ""}`}
                  onClick={() => onCabinChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {variant !== "sheet" && onDone && (
          <button type="button" onClick={onDone} className="dp">
            <span>Done</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default GuestsContent;
