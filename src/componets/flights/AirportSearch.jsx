import { useState, useRef, useEffect } from "react";
import { fetchAirportSuggestions } from "../../services/flights/flightApiService";
import searchIcon from "../../img/icons/tabicons/search-normal.svg";
import "./style.css";

/* Поиск аэропорта (IATA) через LiteAPI.
   variant="popup" — попап-список под полем (десктоп-форма),
   variant="sheet" — поле + список в потоке (нижняя шторка, мобиле). */
const AirportSearch = ({ label = "From", value, onSelect, onEdit, variant = "popup" }) => {
  // null = поле не редактируется — показываем value (тогда swap/сброс извне видны сразу)
  const [query, setQuery] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const debounceRef = useRef(null);

  const airportText = (airport) =>
    airport ? airport.city || airport.name || airport.iata || "" : "";
  const text = query ?? airportText(value);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (variant !== "popup") return;
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variant]);

  const runSearch = async (term) => {
    try {
      const airports = await fetchAirportSuggestions(term);
      setSuggestions(airports.slice(0, 8));
    } catch (err) {
      console.error("Airport search failed", err);
      setSuggestions([]);
    }
  };

  const handleChange = (next) => {
    setQuery(next);
    onEdit?.();
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(next), 300);
  };

  const handleSelect = (airport) => {
    setQuery(null);
    setSuggestions([]);
    setOpen(false);
    onSelect?.(airport);
  };

  const list = suggestions.length > 0 && (
    <div className={variant === "sheet" ? "dest-wrapper dest-wrapper--sheet" : "dest-wrapper"}>
      <p>Airports</p>
      {suggestions.map((airport, index) => (
        <div
          className="dest__list-item"
          // LiteAPI отдаёт дубли IATA (например "San Diego - All Airports" и "San Diego International Airport" — оба SAN)
          key={`${airport.iata}-${index}`}
          onClick={() => handleSelect(airport)}
        >
          <div className="list-itemleft">
            <img src={searchIcon} alt="" />
            <div className="airport-sug">
              <p>{airport.name}</p>
              <span>{[airport.city, airport.country].filter(Boolean).join(", ")}</span>
            </div>
          </div>
          <span className="airport-code">{airport.iata}</span>
        </div>
      ))}
    </div>
  );

  if (variant === "sheet") {
    return (
      <div className="airport-sheet">
        <p>{label}</p>
        <div className="dropdown" ref={boxRef}>
          <input
            type="text"
            className="airport-input airport-input--sheet"
            value={text}
            placeholder="City or airport"
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setOpen(true)}
          />
          {open && list}
        </div>
      </div>
    );
  }

  return (
    <div className="air-item" ref={boxRef}>
      <div className="air-item-box">
        <p>{label}</p>
        <input
          type="text"
          className="airport-input"
          value={text}
          placeholder="City or airport"
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </div>
      {value?.iata && <span className="gray">{value.iata}</span>}
      {open && list}
    </div>
  );
};

export default AirportSearch;
