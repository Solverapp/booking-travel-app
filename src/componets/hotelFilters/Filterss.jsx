import "./style.css";
import starIcon from "../../img/icons/tabicons/star.svg";
import checkboxEmpty from "../../img/icons/tabicons/checkbox.svg";
import checkboxChecked from "../../img/icons/tabicons/checkboxActive.svg";
import checked from "../../img/icons/tabicons/tick-circle.svg";
import { useState, useEffect } from "react";
// import { facilitService } from "../../services/facilitService";
import facilitiesData from "../../mock/facilities";


const BED_TYPES = ["single", "double", "twin", "king", "queen"];

const BOARD_TYPE = [
  { value: "RO", label: "Room Only" },
  { value: "BI", label: "Breakfast Included" },
  { value: "HB", label: "Half Board" },
  { value: "FB", label: "Full Board" },
  { value: "AI", label: "All Inclusive" },
  { value: "DI", label: "Dinner Included" },
  { value: "LI", label: "Lunch Included" },
  { value: "BDI", label: "Breakfast && Dinner Included" },
  { value: "BLI", label: "Breakfast && Lunch Included" },
  { value: "LDI", label: "Lunch and Dinner Included" },
];
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

const HotelFilters = ({ filters, onChange,  onClear }) => {
  const relevantFacilities = facilitiesData
    .filter((item) => Number(item.sort) > 0 && Number(item.sort) <= 26)
    .sort((a, b) => Number(a.sort) - Number(b.sort));
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const visibleFacilities = showAllFacilities
    ? relevantFacilities
    : relevantFacilities.slice(0, 8);
  

  const toggleStar = (star) => {
    const stars = filters.starRating.includes(star)
      ? filters.starRating.filter((s) => s !== star)
      : [...filters.starRating, star];
    onChange({ ...filters, starRating: stars.sort() });
  };
  const toggleGuestRating = (rating) => {
    onChange({
      ...filters,
      minRating: Number(filters.minRating) === rating ? 0 : rating,
    });
  };

  const toggleFacility = (id) => {
    const facilities = filters.facilities.includes(id)
      ? filters.facilities.filter((f) => f !== id)
      : [...filters.facilities, id];
    onChange({ ...filters, facilities });
  };

  const toggleBedType = (type) => {
    const bedTypes = filters.bedTypes.includes(type)
      ? filters.bedTypes.filter((t) => t !== type)
      : [...filters.bedTypes, type];
    onChange({ ...filters, bedTypes });
  };
  const toggleBoardType = (type) => {
    const currentTypes = Array.isArray(filters.boardType)
      ? filters.boardType
      : [];

    const boardType = currentTypes.includes(type)
      ? currentTypes.filter((item) => item !== type)
      : [...currentTypes, type];

    onChange({ ...filters, boardType });
  };

  

  return (
    <div className="filter-box">
      <div className="fb-heder">
        <h3>Filters</h3>
        <button onClick={onClear}>Clear all</button>
      </div>
      {/* <div className="fb-price">
        <h4>Price per night</h4>
        <div className="price-box">
          <div className="min">
            <span className="regular">Min</span>
            <input
              type="number"
              value={filters.priceMin || ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  priceMin: parseInt(e.target.value) || 0,
                })
              }
              placeholder="0"
              min="0"
            />
          </div>
          <div className="max">
            <span className="regular">Max</span>
            <input
              type="number"
              value={filters.priceMax || ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  priceMax: parseInt(e.target.value) || 0,
                })
              }
              placeholder="Any"
              min="0"
            />
          </div>
        </div>
      </div> */}
      <div className="fb-rating">
        <div className="rating-heder">
          <h4>Star rating</h4>
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
                filters.starRating.includes(star)
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
        <h4>Populars amenities</h4>
        {visibleFacilities.map((facility) => (
          <FilterCheckbox
            key={facility.facility_id}
            label={facility.facility}
            isChecked={filters.facilities.includes(facility.facility_id)}
            onChange={() => toggleFacility(facility.facility_id)}
          />
        ))}

        {relevantFacilities.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAllFacilities((value) => !value)}
          >
            {showAllFacilities
              ? "Show less"
              : `Show all (${relevantFacilities.length})`}
          </button>
        )}
      </div>
      <div className="fb-amenities">
        <h4>Bed types</h4>
        {BED_TYPES.map((type) => (
          <FilterCheckbox
            key={type}
            label={type}
            isChecked={filters.bedTypes.includes(type)}
            onChange={() => toggleBedType(type)}
          />
        ))}
      </div>

      <div className="fb-amenities">
        <h4>Meal types</h4>
        {BOARD_TYPE.map(({ value, label }) => (
          <FilterCheckbox
            key={value}
            label={label}
            isChecked={filters.boardType.includes(value)}
            onChange={() => toggleBoardType(value)}
          />
        ))}
      </div>

      <div className="fb-rating">
        <h4>Guest rating</h4>
        <div className="fb-rating-box">
          {RATING_OPTIONS.map((option) => {
            // Проверяем, активна ли эта кнопка прямо сейчас
            const isActive = filters.minRating === option.id;

            return (
              <button
                key={option.id}
                onClick={() => toggleGuestRating(option.id)}
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

export function useFacilities() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadFacilities = async () => {
      try {
        const response = await facilitService.fetchFacilitiesList();

        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.facilities)
              ? response.facilities
              : [];

        const mapped = list
          .map((item) => ({
            id: item.id ?? item.facilityId ?? item.facility_id,
            facility: item.facility ?? item.name ?? item.label,
            sort: item.sort,
          }))
          .filter((item) => item.id != null && item.facility);

        const unique = mapped.filter(
          (item, index, array) =>
            index === array.findIndex((other) => other.id === item.id),
        );

        if (mounted) setFacilities(unique);
      } catch (err) {
        console.error("Facilities fetch error:", err);
        if (mounted) {
          setFacilities([]);
          setError(err.message || "Не удалось загрузить удобства");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadFacilities();

    return () => {
      mounted = false;
    };
  }, []);

  return { facilities, loading, error };
}
