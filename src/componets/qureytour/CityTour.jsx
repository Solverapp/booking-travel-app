import { useRef, useState } from "react";
import LocationCityOutlined from "@mui/icons-material/LocationCityOutlined";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import AnchoredPopover from "../searchfields/AnchoredPopover";
import SuggestionItem from "../searchfields/SuggestionItem";
import { TOUR_DESTINATIONS } from "../../mock/searchDestinations";
import "./style.css";

const CityTour = ({ onCityChange, initialCity, variant = "popup" }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const selected = TOUR_DESTINATIONS.find(
    (item) => item.name.toLowerCase() === String(initialCity ?? "").toLowerCase(),
  );
  const displayValue = selected
    ? `${selected.name}, ${selected.country}`
    : initialCity || "";

  const handleSelect = (item) => {
    setOpen(false);
    onCityChange?.(item.name);
  };

  const renderItem = (item) => (
    <SuggestionItem
      key={item.id}
      icon={<LocationCityOutlined />}
      iconVariant="boxed"
      title={item.name}
      subtitle={item.country}
      selected={selected?.id === item.id}
      onClick={() => handleSelect(item)}
    />
  );

  if (variant === "sheet") {
    return (
      <div className="tour-city-sheet">{TOUR_DESTINATIONS.map(renderItem)}</div>
    );
  }

  return (
    <div className="tour-city">
      <p>Where to?</p>
      <button
        type="button"
        ref={triggerRef}
        className="tour-city__trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={displayValue ? "" : "is-placeholder"}>
          {displayValue || "Select destination"}
        </span>
        <KeyboardArrowDown
          className={`tour-city__arrow${open ? " is-open" : ""}`}
        />
      </button>

      <AnchoredPopover
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        preferredWidth={360}
        ariaLabel="Tour destinations"
      >
        <div className="search-popover__section">
          <div className="search-popover__section-head">
            <span className="search-popover__section-title">
              Popular destinations
            </span>
          </div>
          {TOUR_DESTINATIONS.map(renderItem)}
        </div>
      </AnchoredPopover>
    </div>
  );
};

export default CityTour;
