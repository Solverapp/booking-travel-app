import { useSearchParams, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PageLoader from "../../loaders/PageLoader";
import Sorting from "../sorting/sortingHotel";
import { SORT_OPTIONS } from "../sorting/sortOptions";
import { Rating } from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ReplayIcon from "@mui/icons-material/Replay";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import SearchOption from "../../hotelsearch/NewHotelSearch";
import HotelFilters from "../../hotelFilters/Filterss";
import FilterDrawer from "../../filterdrawer/FilterDrawer";
import BottomSheet from "../../bottomsheet/BottomSheet";
import checked from "../../../img/icons/tabicons/tick-circle.svg";
import { useAuth } from "../../../context/AuthContext";
import {
  MEMBER_SAVE_PERCENT,
  ratingLabel,
  ratingTone,
  formatScore,
  formatNumber,
  boardLabel,
  cancellationLabel,
  paymentLabel,
  taxesAndFeesSummary,
  ratePriceInfo,
} from "../../../utils/hotelRate";


import hotel from "../../../img/icons/tabicons/not.svg";
import "./style.css";

import { useHotelListRates } from "../../../hooks/queries/useHotelListRates";
import { hotelDetailQueryOptions } from "../../../hooks/queries/useHotelDetail";
import { normalizeHotelSearch } from "../../../utils/queryParams";
import { getStoredCurrency } from "../../../utils/currency";

const DEFAULT_FILTERS = {
  starRating: [],
  minRating: 0,
  minReviewsCount: 0,
  facilities: [],
  bedTypes: [],
  boardType: [],
  chainIds: [],
  refundableOnly: false,
};

const HotelList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [sort, setSort] = useState({
    field: "price",
    direction: "ascending",
  });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortOpen, setSortOpen] = useState(false);

  const search = useMemo(() => normalizeHotelSearch(searchParams), [searchParams]);
  const { city, placeId, checkIn, checkOut, adults, children, childrenAges } = search;
  const currency = user?.currency || getStoredCurrency();
  const quests = adults + children;

  const ratesQuery = useHotelListRates({ search, filters, currency });
  const hotels = useMemo(
    () => (Array.isArray(ratesQuery.data?.data?.hotels) ? ratesQuery.data.data.hotels : []),
    [ratesQuery.data],
  );
  const ratesData = useMemo(
    () =>
      new Map(
        (Array.isArray(ratesQuery.data?.data?.data) ? ratesQuery.data.data.data : []).map(
          (item) => [String(item.hotelId), item],
        ),
      ),
    [ratesQuery.data],
  );
  const loading = ratesQuery.isLoading;
  const updating = ratesQuery.isFetching && !loading;
  const error = ratesQuery.error
    ? ratesQuery.error.message || "Failed to fetch hotels"
    : "";

  const nights = useMemo(() => {
    const from = checkIn ? new Date(checkIn) : null;
    const to = checkOut ? new Date(checkOut) : null;
    if (!from || !to || to <= from) return 0;
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  const getHotelRate = useCallback(
    (hotelId) =>
      ratesData.get(String(hotelId))?.roomTypes?.[0]?.rates?.[0] ?? null,
    [ratesData],
  );

  const prefetchHotel = (hotelId) => {
    if (!hotelId) return;
    queryClient.prefetchQuery(hotelDetailQueryOptions(hotelId));
  };

  const handleSignInClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigate("/login", {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

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
  }, [hotels, sort, getHotelRate]);

 

  const params = useMemo(() => {
    const urlParams = new URLSearchParams();
    urlParams.set("city", city || "");
    urlParams.set("pleaseId", placeId || "");
    urlParams.set("checkIn", checkIn || "");
    urlParams.set("checkOut", checkOut || "");
    urlParams.set("adults", String(adults));
    urlParams.set("children", String(children));
    if (childrenAges?.length > 0)
      urlParams.set("childrenAges", childrenAges.join(","));
    return urlParams.toString();
  }, [city, placeId, checkIn, checkOut, adults, children, childrenAges]);

  if (loading) return <PageLoader />;

  return (
    <main className="maincontent">
      <SearchOption />
      <div className="mcontainer">
        <div className="mcontrols">
          <FilterDrawer>
            <HotelFilters
              filters={filters}
              onChange={setFilters}
              onClear={() => setFilters(DEFAULT_FILTERS)}
              placeId={placeId}
            />
          </FilterDrawer>
          <button
            type="button"
            className="sort-toggle-btn"
            aria-label="Sort by"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen(true)}
          >
            <SwapVertOutlinedIcon />
          </button>
        </div>
        <div className="hotel-box">
          <Sorting sort={sort} onChange={setSort} />
          {error && (
            <div className="found-not" role="alert">
              <h3>Could not load hotels</h3>
              <span>{error}</span>
            </div>
          )}
          <div
            className={`hotelbox-grid${updating ? " is-updating" : ""}`}
            aria-busy={updating}
          >
            {updating ? (
              Array.from({ length: 3 }, (_, index) => (
                <div className="hotel-skeleton" key={index} aria-hidden="true">
                  <div className="hotel-skeleton-media" />
                  <div className="hotel-skeleton-body">
                    <span className="hotel-skeleton-line hotel-skeleton-line--title" />
                    <span className="hotel-skeleton-line hotel-skeleton-line--meta" />
                    <span className="hotel-skeleton-line hotel-skeleton-line--meta is-short" />
                    <div className="hotel-skeleton-footer">
                      <span className="hotel-skeleton-line hotel-skeleton-line--price" />
                      <span className="hotel-skeleton-line hotel-skeleton-line--button" />
                    </div>
                  </div>
                </div>
              ))
            ) : hotels.length === 0 ? (
              error ? null : (
                <div className="found-not">
                  <img src={hotel} alt="no hotels found" />
                  <h3>Nothing found matching your request</h3>
                  <span>Please specify other search parameters</span>
                </div>
              )
            ) : (
              
              sortedHotels.map((item) => {
                const rate = getHotelRate(item.id);
                const score = formatScore(item?.rating);
                const tone = ratingTone(item?.rating);
                const board = boardLabel(rate?.boardType, rate?.boardName);
                const cancellation = cancellationLabel(rate);
                const payment = paymentLabel(rate?.paymentTypes);
                const taxes = taxesAndFeesSummary(rate);
                const price = ratePriceInfo(rate);
                return (
                  <NavLink
                    key={`${item.id}`}
                    to={`/hotelpage/${item.id}?${params}`}
                    onMouseEnter={() => prefetchHotel(item.id)}
                    onFocus={() => prefetchHotel(item.id)}
                  >
                    <div className="grid-card">
                      <div className="grid-card-img-box">
                        <img
                          src={item.main_photo}
                          alt="hotel_photo"
                          loading="lazy"
                        />
                        {score && (
                          <div className={`hc-rating hc-rating--${tone}`}>
                            <div className="hc-rating-text">
                              <p>{ratingLabel(item?.rating)}</p>
                              <span>
                                {formatNumber(item?.review_count)} reviews
                              </span>
                            </div>
                            <div className="hc-rating-ribbon">{score}</div>
                          </div>
                        )}
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
                              <p>{item?.address || ""}</p>
                            </div>
                          </div>
                        </div>
                        <div className="card-footer">
                          {!user && (
                            <>
                              <div className="hc-deal-row">
                                <p className="hc-deal-text">
                                  <span
                                    className="hc-deal-link"
                                    role="link"
                                    tabIndex={0}
                                    onClick={handleSignInClick}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        handleSignInClick(event);
                                      }
                                    }}
                                  >
                                    Sign in
                                  </span>{" "}
                                  and save
                                  <span className="hc-deal-chip">
                                    {MEMBER_SAVE_PERCENT}%
                                  </span>
                                </p>
                                <span className="hc-member-badge">
                                  Member Price
                                </span>
                              </div>
                              <div className="hc-divider" />
                            </>
                          )}
                          <div className="hc-rate-row">
                            <div className="hc-rate-room">
                              <p className="hc-room-name">{rate?.name || "—"}</p>
                            </div>
                            <div className="hc-rate-conditions">
                              {board && (
                                <div className="hc-cond-row">
                                  <RestaurantIcon />
                                  <span>{board}</span>
                                </div>
                              )}
                              {cancellation && (
                                <div
                                  className={`hc-cond-row${
                                    cancellation === "Free cancellation"
                                      ? " is-positive"
                                      : ""
                                  }`}
                                >
                                  <ReplayIcon />
                                  <span>{cancellation}</span>
                                </div>
                              )}
                              {payment && (
                                <div className="hc-cond-row">
                                  <CreditCardIcon />
                                  <span>{payment}</span>
                                </div>
                              )}
                            </div>
                            <div className="hc-rate-price">
                              {price.suggested != null && (
                                <p className="hc-old-price">
                                  {formatNumber(price.suggested)}{" "}
                                  {price.currency}
                                </p>
                              )}
                              <p className="hc-total-price">
                                {price.amount != null
                                  ? `${formatNumber(price.amount)} ${price.currency}`
                                  : "N/A"}
                              </p>
                              <span className="hc-price-note">
                                for {nights} nights for {quests} guests
                              </span>
                              {taxes && (
                                <>
                                  <span className="hc-tax-note">
                                    + {formatNumber(taxes.amount, 2)}{" "}
                                    {taxes.currency} taxes and fees
                                  </span>
                                  {taxes.descriptions && (
                                    <span className="hc-tax-desc">
                                      {taxes.descriptions}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
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

      <BottomSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Sort by"
      >
        <div className="sort-sheet">
          {SORT_OPTIONS.map((option) => {
            const isActive =
              sort.field === option.field && sort.direction === option.direction;

            return (
              <button
                key={`${option.field}:${option.direction}`}
                type="button"
                className={`sort-sheet-btn${isActive ? " is-active" : ""}`}
                onClick={() => {
                  setSort({ field: option.field, direction: option.direction });
                  setSortOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isActive && <img src={checked} alt="Selected" />}
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </main>
  );
};

export default HotelList;
