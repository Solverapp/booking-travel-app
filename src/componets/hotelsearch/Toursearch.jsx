import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QureyTour from "../qureytour/CityTour";
import DatePickerH from "../datepickerhotel/DatePickerH";
import DatePickerOne from "../datepicker/DatePickerOne";
import Questselector from "../Tourguest/TourGuestSelector";
import defaultdates from "../../utils/defaultdates";
import sbtn from "../../img/icons/tabicons/search.svg";

import "./style.css";

const SearchOption = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [checkIn, setCheckIn] = useState(null);
  const [checkOutH, setCheckOutH] = useState(null);
  const [city, setCity] = useState("");
  const [guestsHotel, setGuestsHotel] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Инициализируем из URL параметров при загрузке и при изменении searchParams
  useEffect(() => {
    const urlCheckIn = searchParams.get("checkIn");
    const urlCheckOut = searchParams.get("checkOut");
    const urlCity = searchParams.get("city");
    const urlAdults = searchParams.get("adults");
    const urlChildren = searchParams.get("children");
    const urlInfants = searchParams.get("infants");

    if (urlCheckIn) {
      const [y, m, d] = urlCheckIn.split("-");
      setCheckIn(new Date(Number(y), Number(m) - 1, Number(d)));
    }

    if (urlCheckOut) {
      const [y, m, d] = urlCheckOut.split("-");
      setCheckOutH(new Date(Number(y), Number(m) - 1, Number(d)));
    }

    if (urlCity) {
      setCity(urlCity);
    } else {
      setCity("");
    }

    if (urlAdults || urlChildren || urlInfants) {
      setGuestsHotel({
        adults: parseInt(urlAdults) || 1,
        children: parseInt(urlChildren) || 0,
        infants:  0,
      });
    } else {
      setGuestsHotel({
        adults: 1,
        children: 0,
        infants: 0,
      });
    }

    setIsInitialized(true);
  }, [searchParams]);

  const handleGuestsChangeHotel = (newGuests) => {
    setGuestsHotel(newGuests);
  };

  const handleCityChange = (newCity) => {
    setCity(newCity);
  };

    const handleSearchHotel = () => {
      const fmt = (date) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };

      const params = new URLSearchParams({
        city: city,
        checkIn: fmt(checkIn) || defaultdates.tomorrow,
        // checkOut: fmt(checkOutH) || defaultdates.dayAfterTomorrow,
        adults: String(guestsHotel.adults),
        children: String(guestsHotel.children),
        infants: 0,
      });

      if (window.location.pathname.includes("/tours")) {
        setSearchParams(Object.fromEntries(params));
      } else {
        navigate(`/tours?${params.toString()}`);
      }
    };

  if (!isInitialized) {
    return null; // Не рендерим, пока не инициализировали
  }

  return (
    <div className="s-container">
      <div className="s-option">
        <QureyTour
          onCityChange={handleCityChange}
          initialCity={city}
          key={`city-${city}`}
        />
        <DatePickerOne
          checkIn={checkIn}
          onCheckInChange={setCheckIn}
        />
        <Questselector
          onGuestsChange={handleGuestsChangeHotel}
          initialGuests={guestsHotel}
          key={`guests-${guestsHotel.adults}-${guestsHotel.children}-${guestsHotel.infants}`}
        />
        <div className="sop-btn" onClick={handleSearchHotel}>
          <img src={sbtn} alt="sbtn"  />
          <span>Search</span>
        </div>
      </div>
    </div>
  );
};

export default SearchOption;
