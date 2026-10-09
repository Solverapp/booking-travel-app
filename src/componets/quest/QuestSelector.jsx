import { useState, useRef, useEffect } from "react";
import "./style.css";
import minus from "../../img/icons/tabicons/minus.svg";
import plus from "../../img/icons/tabicons/plus.svg";

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

const Questselector = ({ onGuestsChange, initialGuests }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [adults, setAdults] = useState(initialGuests?.adults || 1);
  const [children, setChildren] = useState(initialGuests?.children || 0);
  const [childrenAges, setChildrenAges] = useState(() =>
    parseChildrenAges(initialGuests?.childrenAges)
  );
  const [showChildrenAges, setShowChildrenAges] = useState(
    Boolean(initialGuests?.children) || Boolean(initialGuests?.childrenAges?.length)
  );

  const containerRef = useRef(null);

  const MAX_TOTAL = 10;
  const totalGuests = adults + children;

  useEffect(() => {
    if (initialGuests) {
      setAdults(initialGuests.adults || 1);
      setChildren(initialGuests.children || 0);
      setChildrenAges(parseChildrenAges(initialGuests.childrenAges));
      setShowChildrenAges((initialGuests.children || 0) > 0);
    }
  }, [initialGuests?.adults, initialGuests?.children, initialGuests?.childrenAges]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateGuests = (newAdults, newChildren, newChildrenAges) => {
    const nextAges = Array.isArray(newChildrenAges) ? newChildrenAges : [];

    setAdults(newAdults);
    setChildren(newChildren);
    setChildrenAges(nextAges);
    setShowChildrenAges(newChildren > 0);

    const payload = {
      adults: newAdults,
      children: newChildren,
      childrenAges: nextAges,
    };

    if (onGuestsChange) {
      onGuestsChange(payload);
    }
  };

  const handleChildrenChange = (delta) => {
    if (delta > 0) {
      if (totalGuests >= MAX_TOTAL) return;

      const nextChildren = children + 1;
      const nextAges = [...childrenAges, 5];
      updateGuests(adults, nextChildren, nextAges);
    } else {
      if (children === 0) return;

      const nextChildren = children - 1;
      const nextAges = childrenAges.slice(0, nextChildren);
      updateGuests(adults, nextChildren, nextAges);
    }
  };

  const handleChildAgeChange = (index, age) => {
    const newAges = [...childrenAges];
    newAges[index] = age;

    setChildrenAges(newAges);
    setShowChildrenAges(children > 0);

    if (onGuestsChange) {
      onGuestsChange({
        adults,
        children,
        childrenAges: newAges,
      });
    }
  };

  const handleIncrement = (type) => {
    if (type === "adults") {
      if (totalGuests >= MAX_TOTAL) return;
      updateGuests(adults + 1, children, childrenAges);
    }

    if (type === "children") {
      handleChildrenChange(1);
    }
  };

  const handleDecrement = (type) => {
    if (type === "adults" && adults > 1) {
      updateGuests(adults - 1, children, childrenAges);
    }

    if (type === "children") {
      handleChildrenChange(-1);
    }
  };

  const handleDone = () => {
    setIsOpen(false);
  };

  const getDisplayText = () => {
    const adultText = `${adults} ${adults === 1 ? "adult" : "adults"}`;
    const childText =
      children > 0
        ? `, ${children} ${children === 1 ? "child" : "children"}`
        : ", no children";
    return adultText + childText;
  };

  return (
    <div className="dp-box">
      <p>Guests</p>
      <div className="qb-wrapper" ref={containerRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="dp">
          <span>{getDisplayText()}</span>
        </button>

        {isOpen && (
          <div className="selects-wrapper">
            <div className="selector-box">
              <div className="selector-item">
                <div className="item-left">
                  <p>Adults</p>
                  <span>18+ years</span>
                </div>
                <div className="item-counter">
                  <button
                    className="counter-btn"
                    onClick={() => handleDecrement("adults")}
                    disabled={adults === 1}
                  >
                    <img src={minus} alt="minus" />
                  </button>
                  <p>{adults}</p>
                  <button
                    className="counter-btn"
                    onClick={() => handleIncrement("adults")}
                    disabled={totalGuests >= MAX_TOTAL}
                  >
                    <img src={plus} alt="plus" />
                  </button>
                </div>
              </div>

              <div className="selector-item">
                <div className="item-left">
                  <p>Children</p>
                  <span>2–12 years</span>
                </div>
                <div className="item-counter">
                  <button
                    className="counter-btn"
                    onClick={() => handleDecrement("children")}
                    disabled={children === 0}
                  >
                    <img src={minus} alt="minus" />
                  </button>
                  <p>{children}</p>
                  <button
                    className="counter-btn"
                    onClick={() => handleIncrement("children")}
                    disabled={totalGuests >= MAX_TOTAL}
                  >
                    <img src={plus} alt="plus" />
                  </button>
                </div>
              </div>

              {showChildrenAges && children > 0 && (
                <div className="selector-ages">
                  <div className="ages-left">
                    <span>Select Children ages</span>
                    
                  </div>

                  {Array.from({ length: children }).map((_, idx) => (
                    <div key={idx} className="ages-box">
                      <span>Child {idx + 1} age:</span>
                      <select className="age-select"
                        value={childrenAges[idx] ?? 5}
                        onChange={(e) => handleChildAgeChange(idx, parseInt(e.target.value, 10))}
                      >
                        {Array.from({ length: 18 }, (_, i) => i).map((age) => (
                          <option key={age} value={age}>
                            {age}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" onClick={handleDone} className="dp">
                <span>Done</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Questselector;