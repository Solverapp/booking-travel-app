import { useState } from "react";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import BottomSheet from "../bottomsheet/BottomSheet";
import PleaseSearch from "../qureytour/Pleasenew";
import CityTour from "../qureytour/CityTour";
import CalendarGrid from "../datepicker/CalendarGrid";
import GuestsContent from "../quest/GuestsContent";
import MobileSearchField from "./MobileSearchField";
import MobileDateRangeField from "./MobileDateRangeField";
import {
  guestsDisplayText,
  hotelGuestsDisplayText,
} from "../quest/guestsUtils";
import { formatShortDate } from "../../utils/dateFormat";
import { TOUR_DESTINATIONS } from "../../mock/searchDestinations";
import "./style.css";
import "./mobileSearchBlock.css";

/* Мобильный поиск (≤968px, см. useMediaQuery).
   Туры и отели используют stacked-поля; отели дополнительно получают
   диапазон дат и поиск города с популярными/ближайшими направлениями.
   Состояние и обработчик поиска живут у родителя. */
const MobileSearch = ({
  variant = "home",
  mode = "hotel",
  city = "",
  onCityChange,
  dateMode = "range",
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  guests,
  onGuestsChange,
  onSearch,
  searchDisabled = false,
  searchHint,
  onCityEdit,
}) => {
  const [sheet, setSheet] = useState(null);

  const closeSheet = () => setSheet(null);

  const isTour = mode === "tour";

  const runSearch = () => {
    if (searchDisabled) return;
    onSearch?.();
    closeSheet();
  };

  if (isTour) {
    const selectedCity = TOUR_DESTINATIONS.find(
      (item) => item.name.toLowerCase() === String(city ?? "").toLowerCase(),
    );
    const tourCityValue = selectedCity
      ? `${selectedCity.name}, ${selectedCity.country}`
      : city;
    const tourDateValue = formatShortDate(checkIn, { weekday: true });
    const tourGuestsValue = guestsDisplayText(guests);

    return (
      <div
        className={`msearch msearch--stacked ${
          variant === "home" ? "msearch--home" : "msearch--results"
        }`}
      >
        <div className="msb">
          <MobileSearchField
            icon={<LocationOnOutlined />}
            label="Where to?"
            value={tourCityValue}
            placeholder="Select destination"
            onClick={() => setSheet("city")}
            ariaLabel="Choose tour destination"
          />
          <MobileSearchField
            icon={<CalendarMonthOutlined />}
            label="When"
            value={tourDateValue}
            placeholder="Select date"
            onClick={() => setSheet("date")}
            ariaLabel="Choose tour date"
          />
          <MobileSearchField
            icon={<PersonOutlineOutlined />}
            label="Guests"
            value={tourGuestsValue}
            onClick={() => setSheet("guests")}
            ariaLabel="Choose guests"
          />
          <button
            type="button"
            className="msb-btn"
            disabled={searchDisabled}
            onClick={runSearch}
          >
            Search
          </button>
          {searchDisabled && searchHint ? (
            <p className="msb-hint">{searchHint}</p>
          ) : null}
        </div>

        <BottomSheet
          open={sheet === "city"}
          onClose={closeSheet}
          title="City"
          variant="search"
          showHandle={false}
        >
          <CityTour
            variant="sheet"
            initialCity={city}
            onCityChange={(value) => {
              onCityChange?.(value);
              closeSheet();
            }}
          />
        </BottomSheet>

        <BottomSheet
          open={sheet === "date"}
          onClose={closeSheet}
          title="When"
          variant="search"
          showHandle={false}
        >
          <CalendarGrid
            variant="sheet"
            mode="single"
            checkIn={checkIn}
            onCheckInChange={onCheckInChange}
            onDone={closeSheet}
          />
        </BottomSheet>

        <BottomSheet
          open={sheet === "guests"}
          onClose={closeSheet}
          title="Guests"
          variant="search"
          showHandle={false}
          footer={
            <button
              type="button"
              className="msb-sheet-done"
              onClick={closeSheet}
            >
              Done
            </button>
          }
        >
          <GuestsContent
            variant="sheet"
            mode="tour"
            value={guests}
            onChange={onGuestsChange}
          />
        </BottomSheet>
      </div>
    );
  }

  const hotelDateStart = formatShortDate(checkIn);
  const hotelDateEnd = formatShortDate(checkOut);

  return (
    <div
      className={`msearch msearch--stacked ${
        variant === "home" ? "msearch--home" : "msearch--results"
      }`}
    >
      <div className="msb">
        <MobileSearchField
          icon={<LocationOnOutlined />}
          label="Where to?"
          value={city}
          placeholder="Select destination"
          onClick={() => setSheet("city")}
          ariaLabel="Choose hotel destination"
        />
        <MobileDateRangeField
          icon={<CalendarMonthOutlined />}
          startValue={hotelDateStart}
          endValue={hotelDateEnd}
          startPlaceholder="Check-in"
          endPlaceholder="Check-out"
          onOpen={() => setSheet("date")}
          showClear
          onClear={() => {
            onCheckInChange?.(null);
            onCheckOutChange?.(null);
          }}
          ariaLabel="Choose dates"
        />
        <MobileSearchField
          icon={<PersonOutlineOutlined />}
          label="Guests"
          value={hotelGuestsDisplayText(guests)}
          onClick={() => setSheet("guests")}
          ariaLabel="Choose guests"
        />
        <button
          type="button"
          className="msb-btn"
          disabled={searchDisabled}
          onClick={runSearch}
        >
          Search
        </button>
        {searchDisabled && searchHint ? (
          <p className="msb-hint">{searchHint}</p>
        ) : null}
      </div>

      <BottomSheet
        open={sheet === "city"}
        onClose={closeSheet}
        title="City"
        variant="search"
        showHandle={false}
      >
        <PleaseSearch
          key={`city-${city}`}
          variant="sheet"
          active={sheet === "city"}
          initialCity={city}
          onCityChange={(value, placeId) => {
            onCityChange?.(value, placeId);
            if (value) closeSheet();
          }}
          onCityEdit={onCityEdit}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "date"}
        onClose={closeSheet}
        title="Dates"
        variant="search"
        showHandle={false}
      >
        <CalendarGrid
          variant="sheet"
          mode={dateMode}
          monthCount={dateMode === "range" ? 2 : 1}
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={onCheckInChange}
          onCheckOutChange={onCheckOutChange}
          onDone={closeSheet}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "guests"}
        onClose={closeSheet}
        title="Guests"
        variant="search"
        showHandle={false}
        footer={
          <button type="button" className="msb-sheet-done" onClick={closeSheet}>
            Done
          </button>
        }
      >
        <GuestsContent
          variant="sheet"
          mode="hotel"
          value={guests}
          onChange={onGuestsChange}
        />
      </BottomSheet>
    </div>
  );
};

export default MobileSearch;
