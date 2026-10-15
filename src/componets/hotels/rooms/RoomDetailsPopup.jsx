import { useState, useEffect, useMemo, useCallback } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
  RoundedCorner,
  People,
  KingBed,
  AcUnit,
  Wifi,
  Bathtub,
  Kitchen,
  Desk,
  Phone,
  LocalLaundryService,
  Inventory2,
  Tv,
  Air,
  TaskAlt,
  Apartment,
  Restaurant,
  RoomService,
  Extension,
} from "@mui/icons-material";

const POPULAR_ICON_MAP = [
  { keywords: ["wifi", "internet"], icon: Wifi },
  { keywords: ["air conditioning", "conditioning", "heating"], icon: AcUnit },
  { keywords: ["hair dryer", "hairdryer"], icon: Air },
  { keywords: ["bathroom", "shower", "bathtub", "toilet", "bathrobe"], icon: Bathtub },
  { keywords: ["coffee", "tea", "minibar", "kitchen", "kettle"], icon: Kitchen },
  { keywords: ["desk", "table"], icon: Desk },
  { keywords: ["telephone", "phone", "fax"], icon: Phone },
  { keywords: ["laundry", "ironing"], icon: LocalLaundryService },
  { keywords: ["safe", "deposit"], icon: Inventory2 },
  { keywords: ["tv", "television", "satellite", "video"], icon: Tv },
  { keywords: ["bed", "sheets", "linens"], icon: KingBed },
];

const ROOM_AMENITY_CATEGORIES = [
  {
    key: "bathroom",
    title: "Bathroom",
    icon: Bathtub,
    keywords: [
      "bathroom", "shower", "bathtub", "toilet", "bidet", "hair dryer", "hairdryer",
      "bathrobe", "towels", "slippers", "toiletries", "makeup", "dental", "bath salt",
    ],
  },
  {
    key: "internet",
    title: "Internet",
    icon: Wifi,
    keywords: ["wifi", "wi-fi", "internet", "telephone", "phone", "ethernet", "wired"],
  },
  {
    key: "food",
    title: "Food & Drink",
    icon: Restaurant,
    keywords: [
      "coffee", "tea", "kettle", "minibar", "snack", "refrigerator", "microwave",
      "oven", "toaster", "dishwasher", "stovetop", "kitchen", "dining table", "bar",
    ],
  },
  {
    key: "activities",
    title: "Activities",
    icon: Tv,
    keywords: ["satellite", "channels", "television", "tv", "video", "dvd", "streaming", "game"],
  },
  {
    key: "services",
    title: "Services",
    icon: RoomService,
    keywords: [
      "safety deposit", "housekeeping", "wake up service", "luggage", "concierge",
      "laundry", "ironing", "room service", "wake-up service",
    ],
  },
  {
    key: "general",
    title: "General",
    icon: Apartment,
    keywords: [
      "soundproof", "wardrobe", "radio", "desk", "safe", "clothes", "drying rack",
      "iron", "alarm", "socket", "intercom", "heating", "conditioning",
      "air conditioning", "linens", "wake-up", "key", "entrance", "smoking", "fan",
      "heater", "baby cot", "cots", "sofa", "seating area", "dining area", "view",
      "floor", "curtains", "clothes rack",
    ],
  },
];

const OTHER_CATEGORY = { key: "other", title: "Other", icon: Extension };
const DISPLAY_ORDER = ["general", "bathroom", "internet", "food", "services", "activities", "other"];

const getPopularIcon = (name) => {
  const word = (name || "").toLowerCase();
  const match = POPULAR_ICON_MAP.find(({ keywords }) => keywords.some((k) => word.includes(k)));
  return match ? <match.icon /> : <TaskAlt />;
};

const groupAmenities = (amenities) => {
  const map = {};
  ROOM_AMENITY_CATEGORIES.forEach((c) => {
    map[c.key] = { ...c, items: [] };
  });
  map.other = { ...OTHER_CATEGORY, items: [] };

  amenities.forEach((a) => {
    const name = (a.name || "").toLowerCase();
    const cat = ROOM_AMENITY_CATEGORIES.find((c) => c.keywords.some((k) => name.includes(k)));
    map[cat ? cat.key : "other"].items.push(a);
  });

  return DISPLAY_ORDER.map((k) => map[k]).filter((g) => g.items.length > 0);
};

const cleanText = (str) => (str || "").replace(/<[^>]*>?/gm, "");

const RoomDetailsPopup = ({ room = {}, roomName, hotelPhoto, onClose }) => {
  const [idx, setIdx] = useState(0);

  const gallery = useMemo(() => {
    const photos = (room.photos || []).map((p) => p.hd_url || p.url).filter(Boolean);
    if (photos.length) return photos;
    return hotelPhoto ? [hotelPhoto] : [];
  }, [room.photos, hotelPhoto]);

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + gallery.length) % gallery.length);
  }, [gallery.length]);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % gallery.length);
  }, [gallery.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && gallery.length > 1) next();
      if (e.key === "ArrowLeft" && gallery.length > 1) prev();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, next, prev, gallery.length]);

  const amenities = room.roomAmenities || [];
  const popular = amenities.slice(0, 6);
  const groups = groupAmenities(amenities);

  const sleeps = (room.maxAdults || 0) + (room.maxChildren || 0) || room.maxOccupancy || 0;
  const sizeText = room.roomSizeSquare
    ? `${room.roomSizeSquare} ${(room.roomSizeUnit || "m2").replace("m2", "m\u00B2")}`
    : "";
  const bedsText = (room.bedTypes || [])
    .map((b) => (b.quantity > 1 ? `${b.quantity} ${b.bedType}` : b.bedType))
    .filter(Boolean)
    .join(", ");
  const description = cleanText(room.description || room.normalizedDescription);
  const name = roomName || room.roomName || room.roomTitle || "Room";
  const multi = gallery.length > 1;

  return (
    <div className="rd-popup" onClick={onClose}>
      <div className="rd-popup-card" onClick={(e) => e.stopPropagation()}>
        <div className="rd-popup-head">
          <h3>Room details</h3>
          <button type="button" className="rd-popup-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="rd-popup-body">
          {gallery.length > 0 && (
            <div className="rd-gallery">
              <img src={gallery[idx]} alt={name} />
              {multi && (
                <>
                  <button
                    type="button"
                    className="rd-arrow rd-arrow--left"
                    onClick={(e) => { e.stopPropagation(); prev(); }}
                    aria-label="Previous photo"
                  >
                    <ArrowBackIosIcon />
                  </button>
                  <button
                    type="button"
                    className="rd-arrow rd-arrow--right"
                    onClick={(e) => { e.stopPropagation(); next(); }}
                    aria-label="Next photo"
                  >
                    <ArrowForwardIosIcon />
                  </button>
                  <span className="rd-counter">{idx + 1} / {gallery.length}</span>
                </>
              )}
            </div>
          )}

          <div className="rd-content">
            <h4 className="rd-name">{name}</h4>

            <div className="rd-meta">
              {sizeText && (
                <span className="rd-meta-item">
                  <RoundedCorner />
                  {sizeText}
                </span>
              )}
              {sleeps > 0 && (
                <span className="rd-meta-item">
                  <People />
                  Sleeps {sleeps}
                </span>
              )}
              {bedsText && (
                <span className="rd-meta-item">
                  <KingBed />
                  {bedsText}
                </span>
              )}
            </div>

            {description && <p className="rd-desc">{description}</p>}

            {popular.length > 0 && (
              <>
                <hr className="rd-divider" />
                <h5 className="rd-section">Popular amenities</h5>
                <div className="rd-popular">
                  {popular.map((a, i) => (
                    <div className="rd-pop-item" key={a.amenitiesId ?? `p-${i}`}>
                      {getPopularIcon(a.name)}
                      <span>{a.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {groups.length > 0 && (
              <>
                <hr className="rd-divider" />
                <div className="rd-cats">
                  {groups.map((g) => {
                    const CatIcon = g.icon;
                    return (
                      <div className="rd-cat" key={g.key}>
                        <div className="rd-cat-head">
                          <CatIcon />
                          <span>{g.title}</span>
                        </div>
                        <ul className="rd-cat-list">
                          {g.items.map((a, i) => (
                            <li key={a.amenitiesId ?? `c-${i}`}>{a.name}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetailsPopup;
