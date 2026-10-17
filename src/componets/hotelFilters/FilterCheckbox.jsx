import checkboxEmpty from "../../img/icons/tabicons/checkbox.svg";
import checkboxChecked from "../../img/icons/tabicons/checkboxActive.svg";

/* Чекбокс фильтра — общий для отелей и перелётов */
function FilterCheckbox({ label, isChecked, onChange }) {
  return (
    <div
      className={`filter-checkbox ${isChecked ? "active" : ""}`}
      onClick={onChange}
    >
      <img
        src={isChecked ? checkboxChecked : checkboxEmpty}
        alt={isChecked ? "checked" : "unchecked"}
      />

      <span className="semi">{label}</span>
    </div>
  );
}

export default FilterCheckbox;
