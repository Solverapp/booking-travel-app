import { useState } from "react";
import "./style.css";
import starIcon from "../../img/icons/tabicons/star.svg";
import checkboxEmpty from "../../img/icons/tabicons/checkbox.svg";
import checkboxChecked from "../../img/icons/tabicons/checkboxActive.svg";
import checked from "../../img/icons/tabicons/tick-circle.svg";

const AVAILABLE_AMENITIES = [
  { id: 43061, label: "Culture and Attractions" },
  { id: 11692, label: "Theme Parks" },
  { id: 41802, label: "Water Parks" },
  { id: 25689, label: "Water Activities" },
  { id: 41794, label: "Burj Khalifa Tickets" },
  { id: 11678, label: "City Tours" },
  { id: 11694, label: "Desert Safari Tours" },
  { id: 43136, label: "Nature and Wildlife" },
  { id: 11690, label: "Dhow Cruise" },
];

const RATING_OPTIONS = [
  { id: 9, label: "Price ASC" },
  { id: 8, label: "Price DESC" },
  { id: 7, label: "Popular ASC" },
  { id: 6, label: "Popular DESC" },
];

const TourFilters = ({
  starChange,
  priceChange,
  selectedAmenities = null,
  onAmenityToggle,
  setSelectedAmenities,
  sortType,
  setSortType,
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
    if (sortType === ratingId) {
      setSortType(null);
    } else {
      setSortType(ratingId);
    }
  };

  const handleClearAll = () => {
    setPriceMin("");
    setPriceMax("");
    setSelectedStars([]);
    setSelectedAmenities(null);
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
      <div className="fb-rating">
        <h4>Sort by</h4>
        <div className="fb-rating-box">
          {RATING_OPTIONS.map((option) => {
            // Проверяем, активна ли эта кнопка прямо сейчас
            const isActive = sortType === option.id;

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
        <h4>Categorys</h4>
        {AVAILABLE_AMENITIES.map((amenity) => (
          <FilterCheckbox
            key={amenity.id}
            label={amenity.label}
            // Проверяем, активен ли этот конкретный чекбокс прямо сейчас
            isChecked={selectedAmenities === amenity.label}
            // Передаем id кликнутого чекбокса вверх к родителю
            onChange={() => onAmenityToggle(amenity.label)}
          />
        ))}
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


export default TourFilters;
