import { useState, useEffect, useCallback, useMemo } from "react";
import CloseIcon from "@mui/icons-material/Close";
import facilitiesData from "../../../mock/facilities";
import {
  Wifi,
  LocalParking,
  AcUnit,
  FitnessCenter,
  Pool,
  SmokeFree,
  TaskAlt,
  Restaurant,
  LocalLaundryService,
  Accessible,
  FamilyRestroom,
  Fax,
  Apartment,
  RoomService,
  Park,
  Extension,
} from "@mui/icons-material";

const POPULAR_ICON_MAP = [
  { keywords: ["wifi", "internet"], icon: Wifi },
  { keywords: ["parking", "garage"], icon: LocalParking },
  { keywords: ["fitness", "gym"], icon: FitnessCenter },
  { keywords: ["pool", "swimming"], icon: Pool },
  { keywords: ["restaurant", "dining"], icon: Restaurant },
  { keywords: ["laundry", "ironing", "dry cleaning"], icon: LocalLaundryService },
  { keywords: ["disabled", "wheelchair", "accessible"], icon: Accessible },
  { keywords: ["family", "children", "kids"], icon: FamilyRestroom },
  { keywords: ["fax", "photocop", "business center"], icon: Fax },
  { keywords: ["conditioning", "heating"], icon: AcUnit },
  { keywords: ["smoking", "smoke-free"], icon: SmokeFree },
];

const FACILITY_CATEGORIES = [
  {
    key: "general",
    title: "General",
    icon: Apartment,
    keywords: [
      "non-smoking", "disabled", "elevator", "lift", "safety deposit", "allergy",
      "air conditioning", "conditioning", "heating", "soundproof", "family room",
      "pets", "smoking", "wake-up", "wardrobe", "clothes rack", "drying rack",
      "designated smoking", "key access", "carbon monoxide", "fire extinguisher",
      "first aid", "cctv", "door lock", "alarm", "linens", "towels", "socket near",
    ],
  },
  {
    key: "services",
    title: "Services",
    icon: RoomService,
    keywords: [
      "room service", "front desk", "24-hour", "laundry", "ironing", "dry cleaning",
      "fax", "photocop", "business center", "meeting", "banquet", "concierge",
      "ticket", "luggage", "express check", "check-in", "check-out", "housekeeping",
      "currency", "atm", "shops", "gift", "wake up", "shoe shine", "grocery",
      "vending", "private check", "staff adhere", "guest rooms disinfected",
      "cleaning standards", "physical distancing", "languages spoken",
    ],
  },
  {
    key: "food",
    title: "Food & Drink",
    icon: Restaurant,
    keywords: [
      "restaurant", "bar", "breakfast", "buffet", "coffee", "tea", "snack",
      "wine", "champagne", "special diet", "kid meal", "dining", "chocolate",
      "fruit", "bottle of water", "meal", "kitchen", "microwave", "refrigerator",
      "toaster", "oven", "stovetop", "dishwasher", "kettle", "minibar",
    ],
  },
  {
    key: "internet",
    title: "Internet",
    icon: Wifi,
    keywords: ["wifi", "wi-fi", "internet", "wired", "cable tv", "cable"],
  },
  {
    key: "parking",
    title: "Parking & Transport",
    icon: LocalParking,
    keywords: ["parking", "garage", "shuttle", "airport", "car hire", "transfer", "charging", "electric"],
  },
  {
    key: "wellness",
    title: "Wellness & Fitness",
    icon: Pool,
    keywords: [
      "pool", "spa", "sauna", "fitness", "gym", "jacuzzi", "massage", "hot tub",
      "hottub", "yoga", "wellness", "beauty", "hairdresser", "makeup",
    ],
  },
  {
    key: "outdoors",
    title: "Outdoors & Views",
    icon: Park,
    keywords: [
      "barbecue", "bbq", "garden", "terrace", "balcony", "view", "patio",
      "outdoor", "sun terrace", "picnic", "fireplace", "grounds",
    ],
  },
];

const OTHER_CATEGORY = { key: "other", title: "Other", icon: Extension };

const getPopularIcon = (name) => {
  const word = (name || "").toLowerCase();
  const match = POPULAR_ICON_MAP.find(({ keywords }) => keywords.some((k) => word.includes(k)));
  return match ? <match.icon /> : <TaskAlt />;
};

const groupFacilities = (facilities) => {
  const groups = FACILITY_CATEGORIES.map((c) => ({ ...c, items: [] }));
  const other = { ...OTHER_CATEGORY, items: [] };

  facilities.forEach((f) => {
    const name = (f.name || "").toLowerCase();
    const cat = FACILITY_CATEGORIES.find((c) => c.keywords.some((k) => name.includes(k)));
    const target = cat ? groups.find((g) => g.key === cat.key) : other;
    target.items.push(f);
  });

  return [...groups.filter((g) => g.items.length > 0), ...(other.items.length > 0 ? [other] : [])];
};

const POPULAR_COUNT = 10;

/* Популярные удобства (sort 1..26 в справочнике) — вперёд, остальные по порядку API */
const POPULAR_RANK = new Map(
  facilitiesData
    .filter((item) => Number(item.sort) > 0 && Number(item.sort) <= 26)
    .map((item) => [Number(item.facility_id), Number(item.sort)]),
);

const sortByPopularity = (facilities) => {
  const ranked = [];
  const rest = [];

  facilities.forEach((item) => {
    const rank = POPULAR_RANK.get(Number(item.facilityId));
    if (rank != null) ranked.push({ item, rank });
    else rest.push(item);
  });

  ranked.sort((a, b) => a.rank - b.rank);
  return [...ranked.map((entry) => entry.item), ...rest];
};

const PopularFacilities = ({ facilities = [] }) => {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  const popular = useMemo(
    () => sortByPopularity(facilities).slice(0, POPULAR_COUNT),
    [facilities],
  );

  if (!facilities.length) return null;

  const groups = open ? groupFacilities(facilities) : [];

  return (
    <>
      <div className="fac-head">
        <h2>Popular facilities</h2>
        <button type="button" className="fac-seeall" onClick={() => setOpen(true)}>
          See all
        </button>
      </div>

      <div className="facti-box">
        {popular.map((item, idx) => (
          <div className="facti-btn" key={item.facilityId ?? `f-${idx}`}>
            {getPopularIcon(item.name)}
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      {open && (
        <div className="fac-popup" onClick={close}>
          <div className="fac-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="fac-popup-head">
              <h3>Facilities</h3>
              <button type="button" className="fac-popup-close" onClick={close} aria-label="Close">
                <CloseIcon />
              </button>
            </div>

            <div className="fac-popup-body">
              <div className="fac-popup-section">
                <h4>Popular facilities</h4>
                <div className="fac-popup-popular">
                  {popular.map((item, idx) => (
                    <div className="fac-pop-item" key={item.facilityId ?? `p-${idx}`}>
                      {getPopularIcon(item.name)}
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="fac-popup-divider" />

              <div className="fac-popup-cats">
                {groups.map((g) => {
                  const CatIcon = g.icon;
                  return (
                    <div className="fac-cat" key={g.key}>
                      <div className="fac-cat-head">
                        <CatIcon />
                        <span>{g.title}</span>
                      </div>
                      <ul className="fac-cat-list">
                        {g.items.map((item, idx) => (
                          <li key={item.facilityId ?? `c-${idx}`}>{item.name}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PopularFacilities;
