import "./style.css";
import starIcon from "../../img/icons/tabicons/star.svg";
import checkboxEmpty from "../../img/icons/tabicons/checkbox.svg";
import checkboxChecked from "../../img/icons/tabicons/checkboxActive.svg";
import checked from "../../img/icons/tabicons/tick-circle.svg";

import { useState } from "react";
const AVAILABLE_AMENITIES = [
  { id: "wifi", label: "Free WiFi" },
  { id: "pool", label: "Pool" },
  { id: "parking", label: "Parking" },
  { id: "mealType", label: "Breakfast" },
  { id: "fitness", label: "Fitness center" },
  { id: "nonsmoking", label: "Non-smoking rooms" },
];

const RATING_OPTIONS = [
  { id: 9, label: "Wonderful: 9+" },
  { id: 8, label: "Very Good: 8+" },
  { id: 7, label: "Good: 7+" },
  { id: 6, label: "Pleasant: 6+" },
];

const HotelFilters = ({
  starChange,
  priceChange,
  selectedAmenities = [],
  onAmenityToggle,
  setSelectedAmenities,
  minGuestRating,
  setMinGuestRating,
}) => {
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedStars, setSelectedStars] = useState([]);

  const handleInputMin = (e) => {
    const value = e.target.value;
    setPriceMin(value);

    if (priceChange) {
      priceChange({
        min: value ? parseInt(value) : 0,
        max: priceMax ? parseInt(priceMax) : Infinity,
      });
    }
  };

  const handleInputMax = (e) => {
    const value = e.target.value;
    setPriceMax(value);

    if (priceChange) {
      priceChange({
        min: priceMin ? parseInt(priceMin) : 0,
        max: value ? parseInt(value) : Infinity,
      });
    }
  };

  const toggleStar = (star) => {
    const newStars = selectedStars.includes(star)
      ? selectedStars.filter((s) => s !== star)
      : [...selectedStars, star];

    setSelectedStars(newStars);

    if (starChange) {
      starChange({
        star: newStars,
      });
    }
  };

  const handleRatingClick = (ratingId) => {
    // ЛАЙФХАК: Если пользователь кликает на УЖЕ активную кнопку,
    // мы сбрасываем фильтр в null (чтобы можно было отменить выбор)
    if (minGuestRating === ratingId) {
      setMinGuestRating(null);
    } else {
      setMinGuestRating(ratingId);
    }
  };

  const handleClearAll = () => {
    setPriceMin("");
    setPriceMax("");
    setSelectedStars([]);
    setSelectedAmenities([]);
    setMinGuestRating(null);
    

    if (priceChange) {
      priceChange({ min: 0, max: Infinity });
    }
    if (starChange) {
      starChange({ star: [] });
    }
  };

  return (
    <div className="filter-box">
      <div className="fb-heder">
        <h3>Filters</h3>
        <button onClick={handleClearAll}>Clear all</button>
      </div>
      <div className="fb-price">
        <h4>Price per night</h4>
        <div className="price-box">
          <div className="min">
            <span className="regular">Min</span>
            <input
              type="number"
              value={priceMin}
              onChange={handleInputMin}
              placeholder="Min value"
              min="0"
            />
          </div>
          <div className="max">
            <span className="regular">Max</span>
            <input
              type="number"
              value={priceMax}
              onChange={handleInputMax}
              placeholder="Max value"
              min="0"
            />
          </div>
        </div>
      </div>
      <div className="fb-rating">
        <div className="rating-heder">
          <h4>Property rating</h4>
          <span className="regular">
            Find quality hotels and accommodations for your stay
          </span>
        </div>
        <div className="rating-box">
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => toggleStar(star)}
              className={
                selectedStars.includes(star)
                  ? "rating-item-actived"
                  : "rating-item"
              }
            >
              <p className="bold">{star}</p>
              <img src={starIcon} alt={`${star} star`} />
            </button>
          ))}
        </div>
      </div>
      <div className="fb-amenities">
        <h4>Property amenities</h4>
        {AVAILABLE_AMENITIES.map((amenity) => (
          <FilterCheckbox
            key={amenity.id}
            label={amenity.label}
            // Проверяем, активен ли этот конкретный чекбокс прямо сейчас
            isChecked={selectedAmenities.includes(amenity.id)}
            // Передаем id кликнутого чекбокса вверх к родителю
            onChange={() => onAmenityToggle(amenity.id)}
          />
        ))}
      </div>

      <div className="fb-rating">
        <h4>Review score</h4>
        <div className="fb-rating-box">
          {RATING_OPTIONS.map((option) => {
            // Проверяем, активна ли эта кнопка прямо сейчас
            const isActive = minGuestRating === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleRatingClick(option.id)}
                // Если isActive — добавляем ваш активный класс из макета
                className={`rating-btn ${isActive ? "rating-btn-active" : ""}`}
              >
                <span>{option.label}</span>
                {isActive && <img src={checked} alt="ch" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
function FilterCheckbox({ label, isChecked, onChange }) {
  return (
    // Динамически добавляем класс 'active', если чекбокс выбран
    <div
      className={`filter-checkbox ${isChecked ? "active" : ""}`}
      onClick={onChange}
    >
      {/* Тернарный оператор: если true — показываем checked-иконку, если false — empty */}
      <img
        src={isChecked ? checkboxChecked : checkboxEmpty}
        alt={isChecked ? "checked" : "unchecked"}
      />

      <span className="semi">{label}</span>
    </div>
  );
}


export default HotelFilters;
