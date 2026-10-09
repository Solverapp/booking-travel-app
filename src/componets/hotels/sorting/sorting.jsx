import { useState } from "react";
import './style.css'
import {ArrowDropUp, ArrowDropDown} from '@mui/icons-material';
import checked from "../../../img/icons/tabicons/tick-circle.svg";

const SORTING_OPTIONS = [
  { id: 9, label: "Price", iconId: 0 },
  { id: 8, label: "Price", iconId: 1 },
  { id: 7, label: "Popular", iconId: 0 },
  { id: 6, label: "Popular", iconId: 1 },
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


const Sorting = ({sortType,
  setSortType}) => {
const handleSortingClick = (ratingId) => {
    // ЛАЙФХАК: Если пользователь кликает на УЖЕ активную кнопку,
    // мы сбрасываем фильтр в null (чтобы можно было отменить выбор)
    if (sortType === ratingId) {
      setSortType(null);
    } else {
      setSortType(ratingId);
    }
  };

    return ( 
        <div className="sorting">
                <h4>Sort by</h4>
                <div className="sorting-box">
                  {SORTING_OPTIONS.map((option) => {
                    // Проверяем, активна ли эта кнопка прямо сейчас
                    const isActive = sortType === option.id;
        
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSortingClick(option.id)}
                        // Если isActive — добавляем ваш активный класс из макета
                        className={`sorting-btn ${isActive ? "sorting-btn-active" : ""}`}
                      >
                        {getFacilityIcon(option.iconId)}
                        <span>{option.label}</span>
                        {isActive && <img src={checked} alt="ch" />}
                      </button>
                    );
                  })}
                </div>
              </div>
     );
}
 
export default Sorting;