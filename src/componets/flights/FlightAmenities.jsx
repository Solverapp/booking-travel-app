import WifiOutlinedIcon from "@mui/icons-material/WifiOutlined";
import PowerOutlinedIcon from "@mui/icons-material/PowerOutlined";
import TvOutlinedIcon from "@mui/icons-material/TvOutlined";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import EventSeatOutlinedIcon from "@mui/icons-material/EventSeatOutlined";
import BackpackOutlinedIcon from "@mui/icons-material/BackpackOutlined";
import LuggageOutlinedIcon from "@mui/icons-material/LuggageOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";

const ICONS = {
  wifi: WifiOutlinedIcon,
  power: PowerOutlinedIcon,
  entertainment: TvOutlinedIcon,
  food: RestaurantOutlinedIcon,
  seat_comfort: EventSeatOutlinedIcon,
};

const LABELS = {
  wifi: "Wi-Fi",
  power: "Power",
  entertainment: "Entertainment",
  food: "Food & drinks",
  seat_comfort: "Seat comfort",
  baggage: "Baggage",
};

export const AmenityIcon = ({ category, fontSize = "small" }) => {
  const Icon = ICONS[String(category ?? "").toLowerCase()] ?? CheckCircleOutlineIcon;
  return <Icon fontSize={fontSize} />;
};

const FlightAmenities = ({ amenities = [], baggage = null, title = "Amenities" }) => {
  const rows = amenities.map((amenity, index) => {
    const category = String(amenity?.category ?? "").toLowerCase();
    return {
      key: `amenity-${amenity?.category ?? amenity?.name ?? index}-${index}`,
      icon: <AmenityIcon category={amenity?.category} />,
      name: amenity?.name || LABELS[category] || "Included",
      meta: amenity?.details || "",
      paid: amenity?.chargeable === true,
    };
  });

  if (baggage) {
    (baggage.personal ?? []).forEach((item, index) => {
      rows.push({
        key: `personal-${index}`,
        icon: <BackpackOutlinedIcon fontSize="small" />,
        name: item,
        meta: "Included",
        paid: false,
      });
    });
    baggage.carryOn.forEach((item, index) => {
      rows.push({
        key: `carry-on-${index}`,
        icon: <BackpackOutlinedIcon fontSize="small" />,
        name: item,
        meta: "Included",
        paid: false,
      });
    });
    baggage.checked.forEach((item, index) => {
      rows.push({
        key: `checked-${index}`,
        icon: <LuggageOutlinedIcon fontSize="small" />,
        name: item,
        meta: "Included",
        paid: false,
      });
    });
    (baggage.paid ?? []).forEach((item, index) => {
      rows.push({
        key: `paid-${item.kind}-${index}`,
        icon:
          item.kind === "checked" ? (
            <LuggageOutlinedIcon fontSize="small" />
          ) : (
            <BackpackOutlinedIcon fontSize="small" />
          ),
        name: item.text,
        meta: item.price !== null ? "Available for a fee" : "Paid",
        paid: true,
      });
    });
  }

  if (rows.length === 0) return null;

  return (
    <section className="ffamenities" aria-label={title}>
      <h4 className="ffamenities-title">{title}</h4>
      <div className="ffamenities-list">
        {rows.map((row) => (
          <div className={`ffamenity${row.paid ? " is-paid" : ""}`} key={row.key}>
            <span className="ffamenity-icon">{row.icon}</span>
            <span className="ffamenity-body">
              <span className="ffamenity-name">{row.name}</span>
              {row.meta ? <span className="ffamenity-meta">{row.meta}</span> : null}
            </span>
            {row.paid ? <span className="ffamenity-paid">Paid</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FlightAmenities;
