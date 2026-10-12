import { useState, useRef, useEffect } from "react";
import "./style.css";
import search from "../../img/icons/tabicons/search-normal.svg";
import checkk from "../../img/icons/tabicons/tick-circle.svg";
import { placesService } from "../../services/placesService";

/* Поиск локации через LiteAPI.
   variant="popup" — список-попап под инпутом (десктоп),
   variant="sheet" — тот же список внутри нижней шторки (статичный, скроллится). */
const PleaseSearch = ({ onCityChange, onCityEdit, initialCity, variant = "popup" }) => {
  const [places, setPlaces] = useState([]);
  const [destination, setDestination] = useState(() => initialCity || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const searchPlaces = async (value) => {
    if (value.length < 3) {
      setPlaces([]);
      return;
    }
    try {
      const data = await placesService.fetchPlacesList({ query: value });
      if (data) {
        setPlaces(data);
      }
    } catch (err) {
      console.error("Failed to search places", err);
    }
  };

  const handleDestinationChange = (value) => {
    setDestination(value);
    onCityEdit?.();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(value), 300);
  };

  const handlePlaceSelect = (place) => {
    setDestination(place.displayName);
    setPlaces([]);
    setShowSuggestions(false);

    onCityChange?.(place.displayName, place.placeId);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const destClassName =
    variant === "sheet" ? "dest-wrapper dest-wrapper--sheet" : "dest-wrapper";

  return (
    <div className="sop-box-search">
      <p>Where to?</p>
      <div className="dropdown" ref={dropdownRef}>
        <input
          type="text"
          value={destination}
          onChange={(e) => handleDestinationChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search destination..."
        />

        {showSuggestions && places.length > 0 && (
          <div className={destClassName}>
            <p>Popular destinations</p>
            {places.map((item) => (
              <div
                className="dest__list-item"
                key={`${item.placeId}`}
                onClick={() => handlePlaceSelect(item)}
              >
                <div className="list-itemleft">
                  <img src={search} alt="search" />
                  {item.displayName}, {item.formattedAddress}
                </div>
                {destination === `${item.displayName}` && (
                  <img src={checkk} alt="ch" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PleaseSearch;
