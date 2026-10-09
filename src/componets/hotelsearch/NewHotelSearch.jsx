import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QureyTour from "../qureytour/Pleasenew";
import DatePickerH from "../datepickerhotel/DatePickerH";
import Questselector from "../quest/QuestSelector";
import defaultdates from "../../utils/defaultdates";
import sbtn from "../../img/icons/tabicons/search.svg";

import "./style.css";

const parseChildrenAges = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((age) => parseInt(age, 10))
      .filter((age) => !Number.isNaN(age));
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((age) => parseInt(age, 10))
      .filter((age) => !Number.isNaN(age));
  }

  return [];
};

const SearchOption = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [checkInH, setCheckInH] = useState(null);
  const [checkOutH, setCheckOutH] = useState(null);
  const [city, setCity] = useState("");
  const [pleaseId, setPleaseId] = useState("");
  const [guestsHotel, setGuestsHotel] = useState({
    adults: 1,
    children: 0,
    childrenAges: [],
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const urlCheckIn = searchParams.get("checkIn");
    const urlCheckOut = searchParams.get("checkOut");
    const urlCity = searchParams.get("city");
    const urlPleaseId = searchParams.get("pleaseId");
    const urlAdults = searchParams.get("adults");
    const urlChildren = searchParams.get("children");
    const urlChildrenAges = searchParams.get("childrenAges");

    if (urlCheckIn) {
      const [y, m, d] = urlCheckIn.split("-");
      setCheckInH(new Date(Number(y), Number(m) - 1, Number(d)));
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

    if (urlPleaseId) {
      setPleaseId(urlPleaseId);
    } else {
      setPleaseId("");
    }

    if (urlAdults || urlChildren || urlChildrenAges) {
      setGuestsHotel({
        adults: parseInt(urlAdults, 10) || 1,
        children: parseInt(urlChildren, 10) || 0,
        childrenAges: parseChildrenAges(urlChildrenAges),
      });
    } else {
      setGuestsHotel({
        adults: 1,
        children: 0,
        childrenAges: [],
      });
    }

    setIsInitialized(true);
  }, [searchParams]);

  const handleGuestsChangeHotel = (newGuests) => {
    setGuestsHotel(newGuests);
  };

  const handleCityChange = (newCity, newPleaseId) => {
    setCity(newCity);
    setPleaseId(newPleaseId);
  };

  const handleSearchHotel = () => {
    const fmt = (date) => {
      if (!date) return "";
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const params = new URLSearchParams();

    params.set("city", city || "");
    params.set("pleaseId", pleaseId || "");
    params.set("checkIn", fmt(checkInH) || defaultdates.tomorrow);
    params.set("checkOut", fmt(checkOutH) || defaultdates.dayAfterTomorrow);
    params.set("adults", String(guestsHotel.adults));
    params.set("children", String(guestsHotel.children));

    if (guestsHotel.childrenAges?.length > 0) {
      params.set("childrenAges", guestsHotel.childrenAges.join(","));
    } else {
      params.delete("childrenAges");
    }

    if (window.location.pathname.includes("/hotels")) {
      setSearchParams(params);
    } else {
      navigate(`/hotels?${params.toString()}`);
    }
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <div className="s-container">
      <div className="s-option">
        <QureyTour
          onCityChange={handleCityChange}
          initialCity={city}
          key={`city-${city}`}
        />
        <DatePickerH
          checkInH={checkInH}
          checkOutH={checkOutH}
          onCheckInChangeH={setCheckInH}
          onCheckOutChangeH={setCheckOutH}
        />
        <Questselector
          onGuestsChange={handleGuestsChangeHotel}
          initialGuests={guestsHotel}
          key={`guests-${guestsHotel.adults}-${guestsHotel.children}-${guestsHotel.childrenAges.join(",")}`}
        />
        <div className="sop-btn" onClick={handleSearchHotel}>
          <img src={sbtn} alt="sbtn" />
          <span>Search</span>
        </div>
      </div>
    </div>
  );
};

export default SearchOption;