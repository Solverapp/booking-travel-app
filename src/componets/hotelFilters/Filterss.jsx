import "./style.css";
import starIcon from "../../img/icons/tabicons/star.svg";
import checked from "../../img/icons/tabicons/tick-circle.svg";
import { useState, useEffect, useMemo } from "react";
import FilterCheckbox from "./FilterCheckbox";
// import { facilitService } from "../../services/facilitService";
import facilitiesData from "../../mock/facilities";
import { useHotelChains } from "../../hooks/queries/useHotelChains";


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
const RATING_OPTIONS = [
  { id: 9, label: "Wonderful: 9+" },
  { id: 8, label: "Very Good: 8+" },
  { id: 7, label: "Good: 7+" },
  { id: 6, label: "Pleasant: 6+" },
];

const HotelFilters = ({ filters, onChange, onClear, placeId }) => {
  const relevantFacilities = facilitiesData
    .filter((item) => Number(item.sort) > 0 && Number(item.sort) <= 26)
    .sort((a, b) => Number(a.sort) - Number(b.sort));
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const visibleFacilities = showAllFacilities
    ? relevantFacilities
    : relevantFacilities.slice(0, 8);

  const [chainUi, setChainUi] = useState({
    placeId,
    search: "",
    showAll: false,
  });
  const {
    data: chainsData = [],
    isLoading: chainsLoading,
  } = useHotelChains(placeId);

  const chains = useMemo(
    () =>
      [...chainsData].sort(
        (a, b) =>
          (b.count || 0) - (a.count || 0) ||
          String(a.name).localeCompare(String(b.name)),
      ),
    [chainsData],
  );

  const chainUiForPlace =
    chainUi.placeId === placeId
      ? chainUi
      : { placeId, search: "", showAll: false };
  const chainSearch = chainUiForPlace.search;
  const showAllChains = chainUiForPlace.showAll;
  const setChainSearch = (value) =>
    setChainUi((previous) => {
      const base =
        previous.placeId === placeId
          ? previous
          : { placeId, search: "", showAll: false };
      return {
        ...base,
        search: typeof value === "function" ? value(base.search) : value,
      };
    });
  const setShowAllChains = (value) =>
    setChainUi((previous) => {
      const base =
        previous.placeId === placeId
          ? previous
          : { placeId, search: "", showAll: false };
      return {
        ...base,
        showAll: typeof value === "function" ? value(base.showAll) : value,
      };
    });

  const selectedChainIds = useMemo(
    () => (Array.isArray(filters.chainIds) ? filters.chainIds : []),
    [filters.chainIds],
  );

  const hasActiveFilters =
    (Array.isArray(filters.starRating) && filters.starRating.length > 0) ||
    Number(filters.minRating) > 0 ||
    (Array.isArray(filters.facilities) && filters.facilities.length > 0) ||
    (Array.isArray(filters.bedTypes) && filters.bedTypes.length > 0) ||
    (Array.isArray(filters.boardType) && filters.boardType.length > 0) ||
    selectedChainIds.length > 0 ||
    Boolean(filters.refundableOnly);

  useEffect(() => {
    if (!chains.length || selectedChainIds.length === 0) return;

    const validIds = new Set(chains.map((chain) => chain.id));
    const nextIds = selectedChainIds.filter((id) => validIds.has(id));

    if (nextIds.length !== selectedChainIds.length) {
      onChange({ ...filters, chainIds: nextIds });
    }
  }, [chains, selectedChainIds, filters, onChange]);

  const chainList = useMemo(() => {
    const query = chainSearch.trim().toLowerCase();
    const selectedIds = new Set(selectedChainIds);
    const selected = chains.filter((chain) => selectedIds.has(chain.id));
    const matches = chains.filter(
      (chain) =>
        !selectedIds.has(chain.id) &&
        (!query || String(chain.name).toLowerCase().includes(query)),
    );
    const combined = [...selected, ...matches];

    if (query) return combined.slice(0, 60);
    return showAllChains ? combined : combined.slice(0, 8);
  }, [chains, chainSearch, selectedChainIds, showAllChains]);



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

  const toggleChain = (id) => {
    const chainIds = selectedChainIds.includes(id)
      ? selectedChainIds.filter((item) => item !== id)
      : [...selectedChainIds, id];

    onChange({ ...filters, chainIds });
  };

  const toggleRefundableOnly = () => {
    onChange({ ...filters, refundableOnly: !filters.refundableOnly });
  };

  const handleClear = () => {
    setChainSearch("");
    setShowAllChains(false);
    onClear();
  };

  return (
    <div className="filter-box">
      <div className="fb-heder">
        <h3>Filters</h3>
        {hasActiveFilters && (
          <button type="button" onClick={handleClear}>
            Clear all
          </button>
        )}
      </div>
      {chainsLoading && (
        <div className="fb-amenities">
          <h4>Hotel chain</h4>
          <span className="regular">Loading chains...</span>
        </div>
      )}
      {chains.length > 0 && (
        <div className="fb-amenities fb-chain">
          <h4>Hotel chain</h4>
          <input
            type="search"
            className="fb-chain-search"
            value={chainSearch}
            onChange={(e) => setChainSearch(e.target.value)}
            placeholder="Search chain"
            aria-label="Search hotel chain"
          />
          <div className="fb-chain-list">
            {chainList.map((chain) => (
              <FilterCheckbox
                key={chain.id}
                label={chain.name}
                isChecked={selectedChainIds.includes(chain.id)}
                onChange={() => toggleChain(chain.id)}
              />
            ))}
          </div>
          {chainSearch.trim() && chainList.length === 0 && (
            <span className="regular">No chains found</span>
          )}
          {!chainSearch.trim() && chains.length > 8 && (
            <button
              type="button"
              className="fb-showall"
              onClick={() => setShowAllChains((value) => !value)}
            >
              {showAllChains
                ? "Show less"
                : `Show all (${chains.length})`}
            </button>
          )}
        </div>
      )}
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
            className="fb-showall"
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

      <div className="fb-amenities">
        <h4>Rate conditions</h4>
        <FilterCheckbox
          label="Free cancellation only"
          isChecked={Boolean(filters.refundableOnly)}
          onChange={toggleRefundableOnly}
        />
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
export default HotelFilters;
