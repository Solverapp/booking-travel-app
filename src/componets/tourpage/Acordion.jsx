import { useState } from "react";

const tabs = [
  { id: "description", label: "Description" },
  { id: "inclusion", label: "Inclusion" },
  { id: "important", label: "Inportant info" },
];

export default function CustomizedAccordions(tour) {
  const tourinfo = tour;
  const [activeTab, setActiveTab] = useState("description");

  return (
    <div className="tour-tabs">
      <div className="tabsoption-pill">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tr-btn ${activeTab === tab.id ? "activee" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <p>{tab.label}</p>
          </button>
        ))}
      </div>
      <div className="acord-box">
        <p className={`tab-panel ${activeTab === "description" ? "" : "hiden"}`}>
          {`${tourinfo.tour.descriptEN}`}
        </p>
        <p className={`tab-panel ${activeTab === "inclusion" ? "" : "hiden"}`}>
          {`${tourinfo.tour.inclusionEN}`}
        </p>
        <p className={`tab-panel ${activeTab === "important" ? "" : "hiden"}`}>
          {`${tourinfo.tour.inportantEN}`}
        </p>
      </div>
    </div>
  );
}
