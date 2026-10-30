import { useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./style.css";
import { Rating } from "@mui/material";
import formatPrice from "../../utils/priceFormater";
import Acordion from "../tourpage/Acordion"
import Rates from "../touroption/Optionew";
import AnchoredPopover from "../searchfields/AnchoredPopover";
import CalendarGrid from "../datepicker/CalendarGrid";
import {Place, FavoriteBorder, Favorite, NavigateBefore, EventRepeatOutlined} from '@mui/icons-material';
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../hooks/queries/useFavorites";

const parseDateParam = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return new Date(year, month - 1, day);
};

const formatDateParam = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};



 


const Tour = ({tour}) => {
  const [favoritePending, setFavoritePending] = useState(false);
const navigate = useNavigate();
const [searchParams, setSearchParams] = useSearchParams();
const checkInParam = searchParams.get("checkIn");
const checkIn = parseDateParam(checkInParam);
const [dateOpen, setDateOpen] = useState(false);
const changeDateRef = useRef(null);

const { user, toggleFavorite } = useAuth();
const { data: favorites } = useFavorites();
const favKey = String(tour?.tourId);
const [isFav, setIsFav] = useState(
  favorites?.some((f) => f.service_type === "tour" && String(f.item_id) === favKey) ?? false,
);

const handleToggleFav = async () => {
  if (!user || favoritePending) return;

  const shouldBeFavorite = !isFav;
  setIsFav(shouldBeFavorite);
  setFavoritePending(true);

  try {
    await toggleFavorite(
      "tour",
      tour.tourId,
      shouldBeFavorite,
      {
        item_name: tour.tourName,
        item_image: tour.image,
        item_city: tour.cityName,
        item_country: tour.countryName,
        item_price: tour.price,
      },
      {
        checkIn: searchParams.get("checkIn") || "",
        adults: searchParams.get("adults") || "1",
        children: searchParams.get("children") || "0",
        infants: searchParams.get("infants") || "0",
      },
    );
  } catch (error) {
    setIsFav(!shouldBeFavorite);
    console.error("Не удалось обновить избранное:", error);
  } finally {
    setFavoritePending(false);
  }
};





const handleBack = () => {
  const params = new URLSearchParams(searchParams);
  params.set("adults", "1");
  params.set("children", "0");
  params.set("infants", "0");
  navigate(`/tours?${params.toString()}`);
};

const handleDateChange = (date) => {
  const nextDate = formatDateParam(date);
  if (!nextDate) return;
  const params = new URLSearchParams(searchParams);
  params.set("checkIn", nextDate);
  setSearchParams(params, { replace: true });
  setDateOpen(false);
};

  return (
    <div className="maincontent">
      <div className="hcontainer">
        <div className="hinfo">
          <div className="backoption">
            <button type="button" onClick={handleBack}>
              <NavigateBefore/>
              <span>Back</span>
            </button>
            <button
              type="button"
              ref={changeDateRef}
              onClick={() => setDateOpen((prev) => !prev)}
              aria-haspopup="dialog"
              aria-expanded={dateOpen}
            >
              <EventRepeatOutlined />
              <span>Change</span>
            </button>
            <AnchoredPopover
              open={dateOpen}
              anchorRef={changeDateRef}
              onClose={() => setDateOpen(false)}
              preferredWidth={340}
              align="start"
              ariaLabel="Change tour date"
            >
              <CalendarGrid
                mode="single"
                variant="plain"
                checkIn={checkIn}
                onCheckInChange={handleDateChange}
              />
            </AnchoredPopover>
          </div>
          <div className="tour-hero">
            <div className="tour-hero-media">
              <img src={tour.image} alt={tour.tourName} />
            </div>
            <div className="tour-hero-info">
              <div className="tour-hero-head">
                <h1>{tour.tourName}</h1>
                <div className="tour-hero-rating">
                  <Rating
                    name="half-rating-read"
                    defaultValue={tour.rating}
                    max={tour.rating}
                    precision={1}
                    readOnly
                    size="small"
                  />
                  <span>{tour.reviewCount} reviews</span>
                </div>
                <div className="tour-hero-loc">
                  <Place />
                  <span>{`${tour.cityName}, ${tour.countryName}`}</span>
                </div>
              </div>
              <div className="tour-hero-foot">
                <button
                  type="button"
                  className={`tour-hero-fav${isFav ? " is-active" : ""}`}
                  onClick={handleToggleFav}
                  disabled={!user || favoritePending}
                  aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                >
                  {isFav ? <Favorite /> : <FavoriteBorder />}
                  <span>{isFav ? "Remove" : "Add to favorites"}</span>
                </button>
                <div className="tour-hero-price">
                  <span>from</span>
                  <h2>{formatPrice(tour.price)} AED</h2>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Acordion tour ={tour}/>
        <Rates id = {tour.tourId}  
        tur = {tour.tourName}
        tour = {tour}/>
      </div>
    </div>
  );
};

export default Tour;
