import { useState, useRef, useEffect } from "react";

import "./style.css";
import search from "../../img/icons/tabicons/search-normal.svg";
import checkk from "../../img/icons/tabicons/tick-circle.svg";

/* Выбор локации из списка (туры).
   variant="popup" — список-попап под инпутом (десктоп),
   variant="sheet" — тот же список внутри нижней шторки (статичный, скроллится). */
const QureyTour = ({ onCityChange, initialCity, variant = "popup" }) => {
  const destantion = [
    {
      id: 13668,
      name: "Dubai",
      location: "UAE",
    },
    {
      id: 13236,
      name: "Abu Dhabi",
      location: "UAE",
    },
    {
      id: 23726,
      name: "Singapore",
      location: "Singapore",
    },
  ];

  const [query, setQuery] = useState(() => {
    if (!initialCity) return "";
    const city = destantion.find(
      (item) => item.name.toLowerCase() === initialCity.toLowerCase(),
    );
    return city ? `${city.name}, ${city.location}` : "";
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? destantion.filter(
        (item) =>
          item.name.toLowerCase().includes(trimmed) ||
          item.location.toLowerCase().includes(trimmed),
      )
    : [];

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectItem = (item) => {
    setQuery(`${item.name}, ${item.location}`);
    setShowSuggestions(false);

    // Отправляем город в родительский компонент
    onCityChange?.(item.name);
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

  const renderItem = (item) => (
    <div
      className="dest__list-item"
      key={`${item.id}`}
      onClick={() => handleSelectItem(item)}
    >
      <div className="list-itemleft">
        <img src={search} alt="search" />
        {item.location}, {item.name}
      </div>
      {query === `${item.name}, ${item.location}` && (
        <img src={checkk} alt="ch" />
      )}
    </div>
  );

  return (
    <div className="sop-box-search">
      <p>Where to?</p>
      <div className="dropdown" ref={dropdownRef}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search destination..."
        />

        {showSuggestions && (
          <div className={destClassName}>
            <p>Popular destinations</p>
            {filtered.length > 0 ? filtered.map(renderItem) : destantion.map(renderItem)}
          </div>
        )}
      </div>
    </div>
  );
};

export default QureyTour;
