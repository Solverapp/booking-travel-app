import { useState, useRef, useEffect } from "react";
import "./style.css";
import search from "../../img/icons/tabicons/search-normal.svg";
import checkk from "../../img/icons/tabicons/tick-circle.svg";


const PleaseSearch = ({ onCityChange, initialCity }) => {
  const destantion = [
    {
      id: "ChIJRcbZaklDXz4RYlEphFBu5r0",
      name: "Dubai",
      location: "UAE",
    },
    {
      id: "ChIJufI-cg9EXj4RCBGXQZMuzMc",
      name: "Abu Dhabi",
      location: "UAE",
    },
    {
      id: "ChIJs7s9zbKHUhQRYMPTi_kHuC0",
      name: "Hurgada",
      location: "Egypt",
    },
  ];
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedType, setSelectedType] = useState("location");
  const dropdownRef = useRef(null);

  // Инициализируем и обновляем из URL параметра
  useEffect(() => {
    if (initialCity) {
      const city = destantion.find(
        (item) => item.name.toLowerCase() === initialCity.toLowerCase(),
      );
      if (city) {
        setQuery(`${city.name}, ${city.location}`);
      }
    } else {
      setQuery("");
    }
  }, [initialCity]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim()) {
      const filtered = destantion.filter(
        (item) =>
          item.name.toLowerCase().includes(value.toLowerCase()) ||
          item.location.toLowerCase().includes(value.toLowerCase()),
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(true);
    }
  };

  const handleSelectItem = (item) => {
    const cityName = `${item.name}, ${item.location}`;
    setQuery(cityName);
    setShowSuggestions(false);
    setSuggestions([]);

    // Отправляем город в родительский компонент
    if (onCityChange) {
      onCityChange(item.name, item.id);
    }
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
          <div className="dest-wrapper">
            <p>Popular destinations</p>
            {suggestions.length > 0
              ? suggestions.map((item) => (
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
                ))
              : destantion.map((item) => (
                  <div
                    className="dest__list-item"
                    key={`${item.id}`}
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="list-itemleft">
                      <img src={search} alt="search" />
                      {item.name}, {item.location}
                    </div>
                    {query === `${item.name}, ${item.location}` && (
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
