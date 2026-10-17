import { useSearchParams, NavLink } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import PageLoader from "../../loaders/PageLoader";
import Sorting from "../sorting/sortingHotel";
import { Rating } from "@mui/material";
import SingleBedIcon from "@mui/icons-material/SingleBed";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import SearchOption from "../../hotelsearch/NewHotelSearch";
import HotelFilters from "../../hotelFilters/Filterss";
import FilterDrawer from "../../filterdrawer/FilterDrawer";


import hotel from "../../../img/icons/tabicons/not.svg";
import "./style.css";

// Импортируем наш сервис
import { hotelService } from "../../../services/SupebaseService";
import { DEFAULT_CURRENCY, getStoredCurrency, isCurrencyError } from "../../../utils/currency";

const fetchRatesWithCurrencyFallback = async (payload) => {
  try {
    return await hotelService.fetchHotelsList(payload);
  } catch (err) {
    if (getStoredCurrency() !== DEFAULT_CURRENCY && isCurrencyError(err)) {
      console.warn(
        `Currency ${getStoredCurrency()} is not supported by the provider, falling back to ${DEFAULT_CURRENCY}`,
      );
      return hotelService.fetchHotelsList({ ...payload, currency: DEFAULT_CURRENCY });
    }
    throw err;
  }
};

const DEFAULT_FILTERS = {
  starRating: [],
  minRating: 0,
  minReviewsCount: 0,
  facilities: [],
  bedTypes: [],
  boardType: [],
  refundableOnly: false,
};

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

const HotelList = () => {
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState({
    field: "price",
    direction: "ascending",
  });
  //new constant
  const [hotels, setHotels] = useState([]);
  const [ratesData, setRatesData] = useState(() => new Map());

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  // const {
  //   facilities,
  //   loading: facilitiesLoading,
  //   error: facilitiesError,
  // } = useFacilities();

  // const checkin = searchParams.get('checkin') || '';
  // const checkout = searchParams.get('checkout') || '';
  const adults = parseInt(searchParams.get("adults") || "2");
  const children = parseInt(searchParams.get("children") || "0");
  const childrenAgesStr = searchParams.get("childrenAges") || "";
  const childrenAges = useMemo(
    () => (childrenAgesStr ? childrenAgesStr.split(",").map(Number) : []),
    [childrenAgesStr],
  );
  // const placeId = searchParams.get('placeId');
  const placeName = searchParams.get("placeName");

  const [selectedStars, setSelectedStars] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity });
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [minGuestRating, setMinGuestRating] = useState(null);
  const [sortType, setSortType] = useState(6);

  // Получаем параметры из URL
  const city = searchParams.get("city");
  const placeId = searchParams.get("pleaseId");
  const checkin = searchParams.get("checkIn");
  const checkout = searchParams.get("checkOut");
  const adultsParams = searchParams.get("adults");
  const childrenParams = searchParams.get("children");
  const childrenAgesParams = searchParams.get("childrenAges");

  // const adults = parseInt(adultsParams, 10) || 2;
  // const children = parseInt(childrenParams, 10) || 0;
  // const childrenAges = parseChildrenAges(childrenAgesParams);
  const normalizedChildrenAges =
    childrenAges.length > 0
      ? childrenAges
      : Array.from({ length: children }, () => 5);
  const quests = adults + children;

  const checkIn = checkin ? new Date(checkin) : null;
  const checkOut = checkout ? new Date(checkout) : null;

  const [hotelData, setHotelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  let nights = 0;
  if (checkIn && checkOut && checkOut > checkIn) {
    nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // Запрос по новому
  useEffect(() => {
    let mounted = true;
        const fetchRates = async () => {
      setLoading(true);
      try {
        const occupancies = [{ adults }];

        if (children > 0 && childrenAges.length > 0) {
          occupancies[0].children = childrenAges;
        }

        const body = {
          occupancies,
          currency: getStoredCurrency(),
          guestNationality: "US",
          checkin,
          checkout,
          roomMapping: true,
          maxRatesPerHotel: 1,
          includeHotelData: true,
          placeId,
          limit: 200,
          margin: 10,
        };

        // НАЧАЛО ПРОВЕРКИ: Проверяем, есть ли фильтры вообще
        console.log("Текущие фильтры в компоненте:", filters);

        if (filters?.starRating?.length > 0) body.starRating = filters.starRating;
        if (filters?.minRating > 0) body.minRating = filters.minRating;
        if (filters?.minReviewsCount > 0) body.minReviewsCount = filters.minReviewsCount;
        if (filters?.facilities?.length > 0) body.facilities = filters.facilities;
        if (filters?.bedTypes?.length > 0) body.bedTypes = filters.bedTypes;

        if (filters?.boardType?.length > 0) {
          body.boardType = filters.boardType.join(",");
        }
        if (filters?.refundableOnly) body.refundableRatesOnly = true;

        console.log("Финальный body перед отправкой в Supabase:", body);

        // Сам вызов сервиса
        const data = await fetchRatesWithCurrencyFallback(body);
        console.log("Данные, которые вернулись в компонент из сервиса:", data);

        const hotelList = Array.isArray(data?.hotels) ? data.hotels : [];
        const ratesMap = new Map(
          (Array.isArray(data?.data) ? data.data : []).map((item) => [
            String(item.hotelId),
            item,
          ])
        );

        if (!mounted) return;
        setHotels(hotelList);
        setRatesData(ratesMap);

      } catch (err) {
        if (!mounted) return;
        // КРИТИЧЕСКИЙ ЛОГ: Выведет точную причину падения кода прямо в консоль!
        console.error("🔥 ОШИБКА ВНУТРИ EFFECT В COMPONENT:", err);
        setError("Failed to fetch hotels");
      }
      if (mounted) setLoading(false);
    };


    fetchRates();

    return () => {
      mounted = false;
    };
  }, [checkin, checkout, adults, children, childrenAges, placeId, filters]);

  const getHotelRate = (hotelId) =>
    ratesData.get(String(hotelId))?.roomTypes?.[0]?.rates?.[0] ?? null;

  const sortedHotels = useMemo(() => {
    const getValue = (hotel) => {
      let value;

      if (sort.field === "price") {
        value = getHotelRate(hotel.id)?.retailRate?.suggestedSellingPrice?.[0]
          ?.amount;
      } else if (sort.field === "starRating") {
        value = hotel.stars;
      } else {
        value = hotel.rating;
      }

      return value == null || !Number.isFinite(Number(value))
        ? null
        : Number(value);
    };

    return [...hotels].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      // Отели без значения всегда в конце списка
      if (aValue === null) return bValue === null ? 0 : 1;
      if (bValue === null) return -1;

      return sort.direction === "descending"
        ? bValue - aValue
        : aValue - bValue;
    });
  }, [hotels, ratesData, sort]);

 

  const params = useMemo(() => {
    const urlParams = new URLSearchParams();
    urlParams.set("city", city || "");
    urlParams.set("pleaseId", placeId || "");
    urlParams.set("checkIn", checkin || "");
    urlParams.set("checkOut", checkout || "");
    urlParams.set("adults", String(adults));
    urlParams.set("children", String(children));
    if (childrenAges?.length > 0)
      urlParams.set("childrenAges", childrenAges.join(","));
    return urlParams.toString();
  }, [city, placeId, checkIn, checkOut, adults, children, childrenAges]);

  console.log(hotels);
  console.log(ratesData);

  if (loading) return <PageLoader />;

  return (
    <main className="maincontent">
      <SearchOption />
      <div className="mcontainer">
        <FilterDrawer>
          <HotelFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(DEFAULT_FILTERS)}
          />
        </FilterDrawer>
        <div className="hotel-box">
          <Sorting sort={sort} onChange={setSort} />
          <div className="hotelbox-grid">
            {hotels.length === 0 ? (
              <div className="found-not">
                <img src={hotel} alt="no hotels found" />
                <h3>Nothing found matching your request</h3>
                <span>Please specify other search parameters</span>
              </div>
            ) : (
              
              sortedHotels.map((item) => {
                const rate = getHotelRate(item.id);
                return (
                  <NavLink
                    key={`${item.id}`}
                    to={`/hotelpage/${item.id}?${params}`}
                  >
                    <div className="grid-card">
                      <div className="grid-card-img-box">
                        <img
                          src={item.main_photo}
                          alt="hotel_photo"
                          loading="lazy"
                        />
                        <div className="rating-card-ab">
                          <p>{item?.rating ?? 0}</p>
                          <span>{item?.review_count ?? 0} reviews</span>
                        </div>
                      </div>
                      <div className="grid-card-rigth-box">
                        <div className="card-heder">
                          <div className="card-heder-info">
                            <div className="infoleft">
                              <h3>{item.name}</h3>
                              <div className="infoleft-star">
                                <Rating
                                  name="read-only-stars"
                                  defaultValue={item?.stars || 1}
                                  max={item?.stars || 1}
                                  precision={1}
                                  readOnly
                                  size="small"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="card-heder-loc">
                            <div className="locname">
                              <PlaceOutlinedIcon />
                              <p>{item?.address || ""}..</p>
                            </div>
                          </div>
                        </div>
                        <div className="card-footer">
                          <div className="card-heder-loc">
                            <div className="romname">
                              <SingleBedIcon />
                              <p>{rate?.name}</p>
                            </div>
                            <div className="locdist">
                              <p>{rate?.boardName}</p>
                            </div>
                          </div>
                          <div className="cardfooter-price">
                            <p>
                              {rate?.retailRate?.total?.[0]?.amount?.toFixed(
                                0,
                              ) || "N/A"}{" "}
                              {rate?.retailRate?.total?.[0]?.currency ||
                                getStoredCurrency()}
                            </p>
                            <span>{`${nights} nights, ${quests} guests`}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </NavLink>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default HotelList;
