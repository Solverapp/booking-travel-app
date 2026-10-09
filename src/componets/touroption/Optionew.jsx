import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import "./style.css";
import transferData from "../../mock/transfers";
import Loader from "../loaders/loading";
import Slots from "../slots/Slotsnew";
import OptionData from "../../mock/option";
import RateConter from "../Tourguest/guestCounter";
import guest from "../../img/icons/Hotelicons/Guest.svg";
import { fetchTourOptions, fetchTourStatic, processTourData } from "../../services/raynaService";

const Rates = ({ id, tur }) => {
  const tourid = id;
  const tName = tur;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const city = searchParams.get("city");
  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");
  const adultsParams = searchParams.get("adults");
  const childrenParams = searchParams.get("children");
  const infantsParams = searchParams.get("infants");

  const adults = parseInt(adultsParams || "1");
  const childern = parseInt(childrenParams || "0");
  const infants = parseInt(infantsParams || "0");
  const quests = adults + childern + infants;

  const customOptions = OptionData;

  const [rawOptions, setRawOptions] = useState([]);
  const [staticData, setStaticData] = useState([]);
  const [transfer, setTransfer] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [adultsTotal, setAdultsTotal] = useState(adults);
  const [childsTotal, setChildsTotal] = useState(childern);
  const [totals, setTotals] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState([]);
  const [cartItem, setcartItem] = useState([]);

  const activTab = (tab) => {
    setTransfer(tab);
  };

  const queryParams = {
    tourId: tourid,
    travelDate: checkInParam,
    adults: adultsTotal,
    children: childsTotal,
    infants: infants,
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        const [options, statics] = await Promise.all([
          fetchTourOptions(queryParams),
          fetchTourStatic(tourid)
        ]);
        setRawOptions(options);
        setStaticData(statics);
        if (options && options.length > 0) {
          setTransfer(options[0].transferId);
        }
      } catch (err) {
        setError('Failed to load hotel details');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [id]);

  useEffect(() => {
    const updatePrices = async () => {
      setLoading(true);
      try {
        const options = await fetchTourOptions(queryParams);
        setRawOptions(options);
      } catch (err) {
        setError('Failed to load rates details');
      } finally {
        setLoading(false);
      }
    };
    if (staticData.length > 0) {
      updatePrices();
    }
  }, [adultsTotal, childsTotal]);

  const processedOptions = useMemo(() => {
    return processTourData(rawOptions, staticData, customOptions);
  }, [rawOptions, staticData]);

  const filteredOptions = useMemo(() => {
    return processedOptions.filter((tr) => tr.transferId === transfer);
  }, [processedOptions, transfer]);

  const availableTransferIds = useMemo(() => {
    return new Set(rawOptions.map((op) => op.transferId));
  }, [rawOptions]);

  const handleSlotToggle = (slotId) => {
    if (selectedSlot.id === slotId.id) {
      setSelectedSlot([]);
    } else {
      setSelectedSlot(slotId);
    }
  };

  const handleCounthange = (key, newCounts, newPrice, type) => {
    const p = Number(newPrice || 0);
    const c = Number(newCounts || 0);
    const t = p * c;
    const ty = type;

    setTotals((prev) => {
      if (ty === 'adult') setAdultsTotal(c);
      if (ty === 'child') setChildsTotal(c);
      const exists = prev.some((item) => item.id === key);
      if (exists) {
        return prev.map((item) =>
          item.id === key ? { ...item, qty: c, price: p, total: t } : item
        );
      }
      return [...prev, { id: key, qty: c, total: t, price: p, type: ty }];
    });
  };

  const addToCart = (option, rateTotal, optionName, slotId) => {
    const comission = 1 + (15 / 100);
    const newItem = {
      tourId: tourid,
      optionId: option.tourOptionId,
      transferId: option.transferId,
      optionName: optionName,
      tourName: tur,
      tourDate: checkInParam,
      tourTime: slotId?.time || "10:00",
      slotId: slotId?.id,
      adult: adultsTotal,
      child: childsTotal,
      adultb2b: option.adultPrice,
      adultb2c: Math.round(option.adultPrice * comission),
      childb2b: option.childPrice,
      childb2c: option.childPrice * comission,
      b2cTotal: rateTotal,
      b2bTotal: option.adultPrice * adultsTotal + option.childPrice * childsTotal,
      referNo: Math.floor(100000 + Math.random() * 900000),
      uniqNo: Math.floor(100000 + Math.random() * 900000),
      leadPassangers: adultsTotal + childsTotal,
      city: city
    };
    const next = [...cartItem, newItem];
    setcartItem(next);
    navigate("/toursbookpage/", { state: { cardItem: next } });
  };

  return (
    <div className="rcontainer">
      <div className="content-t">
        <h2>Tickets Price & Offers</h2>
        <div className={`transferoption ${rawOptions.length === 0 ? "hiden" : ""}`}>
          {rawOptions.length > 0 ? (
            transferData.map((tab) => (
              <button
                className={`tr-btn ${transfer === tab.transferId ? "activee" : ""}`}
                onClick={() => activTab(tab.transferId)}
                key={tab.id}
                disabled={!availableTransferIds.has(tab.transferId)}
              >
                <p>{tab.name}</p>
              </button>
            ))
          ) : (
            <Loader />
          )}
        </div>
        <div className="content-row">
          <div className="option-content">
            {loading && rawOptions.length === 0 ? (
              <div className="option-not">
                <Loader />
                <span>Please wait..</span>
              </div>
            ) : !Array.isArray(filteredOptions) || filteredOptions.length === 0 ? (
              <div className="option-not">
                <img src={guest} alt="hotel" />
                <h3>Nothing found matching your request</h3>
                <span>Please specify other search parameters</span>
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const adultTotal = totals.find((it) => it.id === opt.tourOptionId + "adult" + opt.transferId)?.total || 0;
                const childTotal = totals.find((it) => it.id === opt.tourOptionId + "child" + opt.transferId)?.total || 0;
                const rateTotal = adultTotal + childTotal;
                const isSlot = opt.isSlot || false;
                const slotDisabled = selectedSlot.opId !== opt.tourOptionId || null;

                return (
                  <div className="option-box" key={`${opt.tourOptionId}-${opt.transferId}-${index}`}>
                    <div className="option-info">
                      <h4>{opt.optionName} - {opt.tourOptionId} - {opt.transferId}</h4>
                      {isSlot === true && (
                        <Slots 
                          option={opt} 
                          traveldate={checkInParam}
                          isSlot={true}
                          selectedSlot={selectedSlot}
                          handleSlotToggle={handleSlotToggle}
                          setSelectedSlot={setSelectedSlot}
                          count={quests}
                        />
                      )}
                    </div>
                    <div className="rate-box">
                      <div className="rate-item">
                        <div className="rate-guest">
                          <img src={guest} alt="adult" />
                          <span>Adult price: {opt.prices.adult} AED</span>
                        </div>
                        <div className="inforate">
                          <div className="rate-counter" id={opt.tourOptionId + "adult"}>
                            <RateConter
                              id={opt.tourOptionId + "adult" + opt.transferId}
                              onRoomChange={(newCounts, newPrice) =>
                                handleCounthange(opt.tourOptionId + "adult" + opt.transferId, newCounts, newPrice, "adult")
                              }
                              count={10}
                              price={opt.prices.adult}
                              rateCount={adultsTotal}
                            />
                          </div>
                          <div className="rprice">
                            <h4>{adultTotal}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="rate-item">
                        <div className="rate-guest">
                          <img src={guest} alt="child" />
                          <span>Child price: {opt.prices.child} AED</span>
                        </div>
                        <div className="inforate">
                          <div className="rate-counter" id={opt.tourOptionId + "child"}>
                            <RateConter
                              id={opt.tourOptionId + "child" + opt.transferId}
                              onRoomChange={(newCounts, newPrice) =>
                                handleCounthange(opt.tourOptionId + "child" + opt.transferId, newCounts, newPrice, "child")
                              }
                              count={10}
                              price={opt.prices.child}
                              rateCount={childsTotal}
                            />
                          </div>
                          <div className="rprice">
                            <h4>{childTotal}</h4>
                            </div>
                        </div>
                      </div>

<div className="rate-button">
                        <h2>Total {opt.transferId === 41865 ? rateTotal : opt.prices.totalAuto} AED</h2>
                        <button disabled= {isSlot === true && slotDisabled } onClick={() => addToCart(opt, rateTotal, opt.optionName, selectedSlot || 0)} >Buy Now </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rates;