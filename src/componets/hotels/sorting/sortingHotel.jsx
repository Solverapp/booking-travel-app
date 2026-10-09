import { useState } from "react";
import "./style.css";
import { ArrowDropUp, ArrowDropDown } from "@mui/icons-material";
import checked from "../../../img/icons/tabicons/tick-circle.svg";

const SORT_OPTIONS = [
  {
    field: "price",
    direction: "ascending",
    label: "Price: low to high",
    iconId: 0,
  },
  {
    field: "price",
    direction: "descending",
    label: "Price: high to low",
    iconId: 1,
  },
  {
    field: "starRating",
    direction: "descending",
    label: "Stars: high to low",
    iconId: 0,
  },
  {
    field: "rating",
    direction: "descending",
    label: "Rating: high to low",
    iconId: 0,
  },
];

const facilityIcons = [
  { iconId: 1, icon: ArrowDropUp },
  { iconId: 0, icon: ArrowDropDown },
  
];

const getFacilityIcon = (id) => {
  const iid = id;
  const match = facilityIcons.find(( {iconId} ) =>
    iconId === iid
  );

  const Icon = match?.icon;
  return <Icon />;
};

const Sorting = ({ sort, onChange }) => (
  <div className="sorting">
    <h4>Sort by</h4>
    <div className="sorting-box">
      {SORT_OPTIONS.map((option) => {
        const isActive =
          sort.field === option.field && sort.direction === option.direction;

        return (
          <button
            key={`${option.field}:${option.direction}`}
            onClick={() =>
              onChange({
                field: option.field,
                direction: option.direction,
              })
            }
            className={`sorting-btn ${isActive ? "sorting-btn-active" : ""}`}
          >
            {getFacilityIcon(option.iconId)}
            <span>{option.label}</span>
            {isActive && <img src={checked} alt="Выбрано" />}
          </button>
        );
      })}
    </div>
  </div>
);

export default Sorting;
