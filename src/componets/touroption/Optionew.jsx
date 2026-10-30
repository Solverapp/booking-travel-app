import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useMemo } from "react";
import "./style.css";
import transferData from "../../mock/transfers";
import Loader from "../loaders/loading";
import Slots from "../slots/Slotsnew";
import RateConter from "../Tourguest/guestCounter";
import { AccessTime, Block, Group, DirectionsCar, ErrorOutlined, Person, ChildCare, ArrowForward } from '@mui/icons-material';

// Импортируем наши обновленные сервисы
import { fetchTourOptions, fetchTourStatic, processTourData, fetchTourAvailability, roundTo, toBool } from "../../services/raynaService";
import { supabaseTourService } from "../../services/supabaseTourService"; // <--- Наш сервис скидок
import { formatAedAmount, formatTourTime, saveTourCheckoutItem, transferTypeOf } from "../../utils/tourCheckout";
import { useAuth } from "../../context/AuthContext";
import { useAuthPrompt } from "../../context/authPrompt";

const transferIcons = {
  block: Block,
  group: Group,
  car: DirectionsCar,
};

const Rates = ({ id, tur, tour }) => {
  const tourid = id;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openAuthPrompt } = useAuthPrompt();

  const city = searchParams.get("city");
  const checkInParam = searchParams.get("checkIn");
  const adultsParams = searchParams.get("adults");
  const childrenParams = searchParams.get("children");

  const adults = parseInt(adultsParams || "1", 10) || 1;
  const childern = parseInt(childrenParams || "0", 10) || 0;

  const [rawOptions, setRawOptions] = useState([]);
  const [staticData, setStaticData] = useState([]);
  const [dbDiscounts, setDbDiscounts] = useState([]);
  const [transfer, setTransfer] = useState();
  const [metaTourId, setMetaTourId] = useState(null);
  const [optionsTourId, setOptionsTourId] = useState(null);
  const [adultsTotal, setAdultsTotal] = useState(adults);
  const [childsTotal, setChildsTotal] = useState(childern);
  const [totals, setTotals] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState([]);
  const [cartItem, setcartItem] = useState([]);
  const [availabilityData, setAvailabilityData] = useState(null);
  const requestIdRef = useRef(0);

  const activTab = (tab) => { setTransfer(tab); };

  useEffect(() => {
    let cancelled = false;

    const loadMeta = async () => {
      try {
        const [statics, discounts] = await Promise.all([
          fetchTourStatic(tourid),
          supabaseTourService.fetchDiscountRates(tourid),
        ]);
        if (cancelled) return;
        setStaticData(statics);
        setDbDiscounts(discounts);
      } catch {
        if (cancelled) return;
        setStaticData([]);
        setDbDiscounts([]);
      } finally {
        if (!cancelled) setMetaTourId(tourid);
      }
    };

    loadMeta();
    return () => { cancelled = true; };
  }, [tourid]);

  const metaReady =
    metaTourId !== null && String(metaTourId) === String(tourid);
  const optionsReady =
    optionsTourId !== null && String(optionsTourId) === String(tourid);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const loadOptions = async () => {
      setSelectedSlot([]);

      try {
        const options = await fetchTourOptions({
          tourId: tourid,
          travelDate: checkInParam,
          adults: adultsTotal,
          children: childsTotal,
          infants: 0,
        });

        if (cancelled || requestId !== requestIdRef.current) return;
        setRawOptions(options);

        if (!options || options.length === 0) {
          setAvailabilityData([]);
          setOptionsTourId(tourid);
          return;
        }

        const availResults = await Promise.all(
          options.map(async (opt) => {
            const childAllowed = !toBool(opt.disableChild);
            const check = await fetchTourAvailability({
              tourId: tourid,
              tourOptionId: opt.tourOptionId,
              transferId: opt.transferId,
              travelDate: checkInParam,
              adults: adultsTotal,
              children: childAllowed ? childsTotal : 0,
              infants: 0,
            });
            return {
              tourOptionId: opt.tourOptionId,
              transferId: opt.transferId,
              status: check.status,
              message: check.message,
            };
          }),
        );

        if (cancelled || requestId !== requestIdRef.current) return;
        setAvailabilityData(availResults);
        setTransfer((prev) =>
          options.some((op) => String(op.transferId) === String(prev))
            ? prev
            : options[0].transferId,
        );
        setOptionsTourId(tourid);
      } catch {
        if (cancelled || requestId !== requestIdRef.current) return;
        setRawOptions([]);
        setAvailabilityData([]);
        setOptionsTourId(tourid);
      }
    };

    loadOptions();
    return () => { cancelled = true; };
  }, [tourid, checkInParam, adultsTotal, childsTotal]);

  // --- ОПТИМИЗАЦИЯ: Передаем массив availabilityData в процессор данных ---
  const processedOptions = useMemo(() => {
    return processTourData(rawOptions, staticData, dbDiscounts, availabilityData);
  }, [rawOptions, staticData, dbDiscounts, availabilityData]);

  

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
    const t = roundTo(p * c, 2);
    const ty = type;

    if (ty === "adult") setAdultsTotal(c);
    if (ty === "child") setChildsTotal(c);

    setTotals((prev) => {
      const exists = prev.some((item) => item.id === key);
      if (exists) {
        return prev.map((item) =>
          item.id === key ? { ...item, qty: c, price: p, total: t } : item,
        );
      }
      return [...prev, { id: key, qty: c, total: t, price: p, type: ty }];
    });
  };

  const addToCart = (option, rateTotal, optionName, slotId) => {
    if (!user) {
      openAuthPrompt({
        service: "tour",
        from: `${window.location.pathname}${window.location.search}`,
      });
      return;
    }
    const transferInfo = transferData.find(
      (item) => Number(item.transferId) === Number(option.transferId),
    );
    const transferName = option.transferName || transferInfo?.name || "";
    const transferType = transferTypeOf({
      transferId: option.transferId,
      transferName,
    });

    const childAllowed = !toBool(option.disableChild);
    const optionChild = childAllowed ? childsTotal : 0;
    const optionInfant = 0;
    const adultB2c = Number(option.prices?.adult || 0);
    const childB2c = Number(option.prices?.child || 0);
    const adultB2b = Number(option.adultPrice || 0);
    const childB2b = Number(option.childPrice || 0);
    const infantB2b = Number(option.infantPrice || 0);
    const computedB2cTotal = roundTo(
      adultB2c * adultsTotal + childB2c * optionChild,
      2,
    );
    const b2cTotal =
      Number.isFinite(Number(rateTotal)) && Number(rateTotal) > 0
        ? roundTo(Number(rateTotal), 2)
        : computedB2cTotal;

    const newItem = {
      tourId: tourid,
      tourName: tur,
      tourImage: tour?.image || "",
      city: tour?.cityName || city || "",
      country: tour?.countryName || "",
      optionId: option.tourOptionId,
      optionName,
      transferId: option.transferId,
      transferName,
      transferType,
      tourDate: checkInParam,
      startTime: option.startTime || "",
      tourTime: slotId?.time || option.startTime || "10:00",
      slotId: slotId?.id || 0,
      slotTime: slotId?.time || "",
      isSlot: toBool(option.isSlot),
      adult: adultsTotal,
      child: optionChild,
      infant: optionInfant,
      adultb2b: adultB2b,
      adultb2c: adultB2c,
      childb2b: childB2b,
      childb2c: childB2c,
      infantb2b: infantB2b,
      b2cTotal,
      b2bTotal: roundTo(
        adultB2b * adultsTotal +
          childB2b * optionChild +
          infantB2b * optionInfant,
        2,
      ),
      finalAmount: Number(option.finalAmount || 0),
      leadPassengers: adultsTotal + optionChild + optionInfant,
    };

    const next = [...cartItem, newItem];
    setcartItem(next);
    saveTourCheckoutItem(newItem);
    navigate("/toursbookpage", { state: { cardItem: next } });
  };

  return (
    <div className="rcontainer">
      <div className="content-t">
        <h2>Tickets Price & Offers</h2>
        <div
          className={`transferoption ${rawOptions.length === 0 ? "hiden" : ""}`}
        >
          {rawOptions.length > 0 ? (
            transferData.map((tab) => {
              const TransferIcon = transferIcons[tab.icon];
              return (
                <button
                  className={`tr-btn ${transfer === tab.transferId ? "activee" : ""}`}
                  onClick={() => activTab(tab.transferId)}
                  key={tab.id}
                  disabled={!availableTransferIds.has(tab.transferId)}
                >
                  {TransferIcon && <TransferIcon className="tr-icon" />}
                  <p>{tab.short}</p>
                </button>
              );
            })
          ) : (
            <Loader />
          )}
        </div>
        <div className="content-row">
          <div className="option-content">
            {!metaReady || !optionsReady ? (
              <div className="option-not">
                <Loader />
                <span>Please wait..</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="option-not">
                < ErrorOutlined/>
                <h3>Not found</h3>
                <span>Please specify other search parameters</span>
              </div>
            ) : (
                          filteredOptions.map((opt, index) => {
                const adultKey = opt.tourOptionId + "adult" + opt.transferId;
                const childKey = opt.tourOptionId + "child" + opt.transferId;
                const childAllowed = !toBool(opt.disableChild);
                const adultTotal =
                  totals.find((it) => it.id === adultKey)?.total || 0;
                const childTotal = childAllowed
                  ? totals.find((it) => it.id === childKey)?.total || 0
                  : 0;
                const hasGuestTotals = totals.some(
                  (it) =>
                    it.id === adultKey || (childAllowed && it.id === childKey),
                );
                const rawOptionTotal = hasGuestTotals
                  ? adultTotal + childTotal
                  : opt.prices.totalAuto;
                const optionTotal = roundTo(Number(rawOptionTotal) || 0, 2);
                const optionGuestCount =
                  adultsTotal + (childAllowed ? childsTotal : 0);
                const departureLabel =
                  String(opt.departureTime || "").trim() ||
                  (opt.startTime ? formatTourTime(opt.startTime) : "");
                const isSlot = toBool(opt.isSlot);
                const slotDisabled =
                  selectedSlot.opId !== opt.tourOptionId || null;

                return (
                  <div
                    className={`option-box${!opt.isAvailable ? " tour-disabled" : ""}`}
                    key={`${opt.tourOptionId}-${opt.transferId}-${index}`}
                  >
                    <div className="tour-option-head">
                      <h4>{opt.optionName}</h4>
                      {departureLabel ? (
                        <p className="tour-option-departure">
                          <AccessTime />
                          <span>Departure: {departureLabel}</span>
                        </p>
                      ) : null}
                      {!opt.isAvailable && (
                        <div className="availability-alert">
                          <ErrorOutlined />
                          <span>{opt.availabilityMessage}</span>
                        </div>
                      )}
                      {isSlot === true && opt.isAvailable && (
                        <Slots
                          option={opt}
                          traveldate={checkInParam}
                          isSlot={true}
                          selectedSlot={selectedSlot}
                          handleSlotToggle={handleSlotToggle}
                          setSelectedSlot={setSelectedSlot}
                          count={optionGuestCount}
                        />
                      )}
                    </div>
                    <div className="tour-guest-list">
                      <div className="tour-guest-row tour-guest-row--adult">
                        <span className="tour-guest-avatar">
                          <Person />
                        </span>
                        <div className="tour-guest-info">
                          <span className="tour-guest-name">Adult</span>
                          <span className="tour-guest-price">
                            {formatAedAmount(opt.prices.adult)} AED
                          </span>
                        </div>
                        <RateConter
                          id={opt.tourOptionId + "adult" + opt.transferId}
                          onRoomChange={(newCounts, newPrice) =>
                            handleCounthange(
                              opt.tourOptionId + "adult" + opt.transferId,
                              newCounts,
                              newPrice,
                              "adult",
                            )
                          }
                          type="adult"
                          count={10}
                          price={opt.prices.adult}
                          rateCount={adultsTotal}
                          disabled={!opt.isAvailable}
                        />
                      </div>
                      {childAllowed && (
                        <div className="tour-guest-row tour-guest-row--child">
                          <span className="tour-guest-avatar">
                            <ChildCare />
                          </span>
                          <div className="tour-guest-info">
                            <span className="tour-guest-name">
                              Child({opt.childAge})
                            </span>
                            <span className="tour-guest-price">
                              {formatAedAmount(opt.prices.child)} AED
                            </span>
                          </div>
                          <RateConter
                            id={opt.tourOptionId + "child" + opt.transferId}
                            onRoomChange={(newCounts, newPrice) =>
                              handleCounthange(
                                opt.tourOptionId + "child" + opt.transferId,
                                newCounts,
                                newPrice,
                                "child",
                              )
                            }
                            type="child"
                            count={10}
                            price={opt.prices.child}
                            rateCount={childsTotal}
                            disabled={!opt.isAvailable}
                          />
                        </div>
                      )}
                    </div>
                    <div className="tour-option-footer">
                      <div className="tour-option-total">
                        <span>Total</span>
                        <h2>
                          {!opt.isAvailable
                            ? "0.00"
                            : formatAedAmount(optionTotal)}{" "}
                          AED
                        </h2>
                      </div>
                      <button
                        className="tour-buy-btn"
                        disabled={(isSlot && slotDisabled) || !opt.isAvailable}
                        onClick={() =>
                          addToCart(
                            opt,
                            optionTotal,
                            opt.optionName,
                            selectedSlot || 0,
                          )
                        }
                      >
                        {!opt.isAvailable ? "Not Available" : "Buy Now"}
                        {opt.isAvailable && <ArrowForward />}
                      </button>
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
