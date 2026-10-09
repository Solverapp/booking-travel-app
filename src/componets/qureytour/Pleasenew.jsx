import { useState, useRef, useEffect } from "react";
import {useSearchParams } from "react-router-dom";
import "./style.css";
import search from "../../img/icons/tabicons/search-normal.svg";
import checkk from "../../img/icons/tabicons/tick-circle.svg";
import { placesService } from "../../services/placesService";

const PleaseSearch = ({ onCityChange, initialCity }) => {
  const [places, setPlaces] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("du");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [destination, setDestination] = useState('');
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const urlCity = searchParams.get("city");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Инициализируем и обновляем из URL параметра
 useEffect(() => {
    if (initialCity) {
      const city = urlCity;
      if (city) {
        setDestination(`${city}`);
      }
    } else {
      setDestination("");
    }
  }, [initialCity]);

  const searchPlaces = async (query) => {
    if (query.length < 3) {
      setPlaces([]);
      return;
    }
    try {
      const data = await placesService.fetchPlacesList({
            query: query,
          });
      
      if (data) {
        setPlaces(data);
      }
    } catch (err) {
      console.error('Failed to search places', err);
    }
  };


  const handleDestinationChange = (value) => {
    setDestination(value);
    setSelectedPlace(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(value), 300);
  };

  const handlePlaceSelect = (place) => {
    setDestination(place.displayName);
    setSelectedPlace(place);
    setPlaces([]);
    setShowSuggestions(false);

    if (onCityChange) {
      onCityChange(place.displayName, place.placeId);
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


// Запрос списка отелей через наш новый сервис
    // useEffect(() => {
    //   let isMounted = true;
    //   const loadPlaces = async () => {
    //     setLoading(true);
    //     setError('');
    //     if (query.length < 2) {
    //   setQuery("");
    //   return;
    // }
    //     try {
    //       const data = await placesService.fetchPlacesList({
    //         query: query,
    //       });
    //       if (isMounted) setSuggestions(data);
    //     } catch (err) {
    //       if (isMounted) setError('Failed to load Plasec');
    //     } finally {
    //       if (isMounted) setLoading(false);
    //     }
    //   };
  
    //   loadPlaces();
    //   return () => { isMounted = false; };
    // }, []);

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

        {showSuggestions && places.length > 0 &&(
          <div className="dest-wrapper">
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
                ))
              }
          </div>
        )}
      </div>
    </div>
  );
};

export default PleaseSearch;
