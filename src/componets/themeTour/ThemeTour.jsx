import { useState, useRef, useEffect } from "react";
import "./style.css";
import check from "../../img/icons/tabicons/tick-circle.svg";
const ThemeTour = () => {
    const theme = ['Culture', 'Beaches', 'Active', 'Gastronomy','Extreme'];


const [query, setQuery] = useState("");
const [suggestions, setSuggestions] = useState([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [selectedType, setSelectedType] = useState("");
const dropdownRef = useRef(null);

const handleInputChange = (e) => {
  const value = e.target.value;
  setQuery(value);

  if (value.trim()) {
    const filtered = theme.filter(
      (item) =>
        item.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(filtered);
    setShowSuggestions(true);
  } else {
    setSuggestions([]);
    setShowSuggestions(true);
  }
};

const handleSelectItem = (item) => {
  setQuery(`${item}`);
  setShowSuggestions(false);
  setSuggestions([]);
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
      <div className="theme-box">
        <p>Theme</p>
        <div className="dropdown" ref={dropdownRef}>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search Theme.."
          />

          {showSuggestions && (
            <div className="theme-wrapper">
              {suggestions.length > 0
                ? suggestions.map((item) => (
                    <div
                      className="dest__list-item"
                      key={`${item}`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="list-itemleft">{item}</div>
                    </div>
                  ))
                : theme.map((item) => (
                    <div
                      className="dest__list-item"
                      key={`${item}`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="list-itemleft">{item}</div>
                      {query === item && <img src={check} alt="search" />}
                    </div>
                  ))}
            </div>
          )}
        </div>
      </div>
    );
}
 
export default ThemeTour;