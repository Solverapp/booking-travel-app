import { useState, useRef, useEffect } from "react";
import "./style.css";
import minus from "../../img/icons/tabicons/minus.svg";
import plus from "../../img/icons/tabicons/plus.svg";

const Questselector = ({ onGuestsChange, initialGuests, total, adultPrice, childPrice }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [adults, setAdults] = useState(initialGuests?.adults || 1);
  const [children, setChildren] = useState(initialGuests?.children || 0);
  const [infants, setInfants] = useState(initialGuests?.infants || 0);
  const [rateTotal, setRateTotal] = useState(total || 0);
  const containerRef = useRef(null);

  const MAX_TOTAL = 10;
  const totalGuests = adults + children + infants;

  // Синхронизируем состояние с initialGuests
  useEffect(() => {
    if (initialGuests) {
      setAdults(initialGuests.adults || 1);
      setChildren(initialGuests.children || 0);
      setInfants(initialGuests.infants || 0);
    }
  }, [initialGuests?.adults, initialGuests?.children, initialGuests?.infants]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateGuests = (newAdults, newChildren, newInfants) => {
    setAdults(newAdults);
    setChildren(newChildren);
    setInfants(newInfants);
    if (onGuestsChange) {
      onGuestsChange({
        adults: newAdults,
        children: newChildren,
        infants: newInfants,
      });
    }
  };

  const handleIncrement = (type) => {
    if (totalGuests >= MAX_TOTAL) return;

    if (type === "adults") 
      updateGuests(adults + 1, children, infants);
    setRateTotal(total + (adults*adultPrice));
    if (type === "children")
       updateGuests(adults, children + 1, infants);
      setRateTotal(total + (children * adultPrice));
    if (type === "infants")
       updateGuests(adults, children, infants + 1);
      setRateTotal(total + (infants * adultPrice));
  };

  const handleDecrement = (type) => {
    if (type === "adults" && adults > 1)
      updateGuests(adults - 1, children, infants);
    setRateTotal(total - (adults * adultPrice));
    if (type === "children" && children > 0)
      updateGuests(adults, children - 1, infants);
    if (type === "infants" && infants > 0)
      updateGuests(adults, children, infants - 1);
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
          <div className="selector-wrapper">
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
              <div className="selector-item">
                <div className="item-left">
                  <p>Infants</p>
                  <span>0–2 years</span>
                </div>
                <div className="item-counter">
                  <button
                    className="counter-btn"
                    onClick={() => handleDecrement("infants")}
                    disabled={infants === 0}
                  >
                    <img src={minus} alt="minus" />
                  </button>
                  <p>{infants}</p>
                  <button
                    className="counter-btn"
                    onClick={() => handleIncrement("infants")}
                    disabled={totalGuests >= MAX_TOTAL}
                  >
                    <img src={plus} alt="plus" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Questselector;
