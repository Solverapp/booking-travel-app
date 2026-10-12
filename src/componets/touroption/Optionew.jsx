import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import "./style.css";
import transferData from "../../mock/transfers";
import Loader from "../loaders/loading";
import Slots from "../slots/Slotsnew";
import RateConter from "../Tourguest/guestCounter";
import {FamilyRestroom, People, NotInterestedOutlined, Block, Group, DirectionsCar,ErrorOutlined} from '@mui/icons-material';

import guest from "../../img/icons/Hotelicons/Guest.svg";
// Импортируем наши обновленные сервисы
import { fetchTourOptions, fetchTourStatic, processTourData, fetchTourAvailability } from "../../services/raynaService";
import { supabaseTourService } from "../../services/supabaseTourService"; // <--- Наш сервис скидок

const transferIcons = {
  block: Block,
  group: Group,
  car: DirectionsCar,
};

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

  

  const [rawOptions, setRawOptions] = useState([]);
  const [staticData, setStaticData] = useState([]);
  const [dbDiscounts, setDbDiscounts] = useState([]); // <--- СТЕЙТ ДЛЯ ХРАНЕНИЯ СКИДОК ИЗ БАЗЫ
  const [transfer, setTransfer] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [adultsTotal, setAdultsTotal] = useState(adults);
  const [childsTotal, setChildsTotal] = useState(childern);
  const [totals, setTotals] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState([]);
  const [cartItem, setcartItem] = useState([]);

  const activTab = (tab) => { setTransfer(tab); };

  const queryParams = {
    tourId: tourid,
    travelDate: checkInParam,
    adults: adultsTotal,
    children: childsTotal,
    infants: infants,
  };
   const [availabilityData, setAvailabilityData] = useState(null); // Стейт для хранения статусов доступности

  // --- ЭФФЕКТ 1: Инициализация данных (Склеиваем API, Скидки и Доступность) ---
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        const [options, statics, discounts] = await Promise.all([
          fetchTourOptions(queryParams),
          fetchTourStatic(tourid),
          supabaseTourService.fetchDiscountRates(tourid)
        ]);

        setDbDiscounts(discounts);
        setStaticData(statics);
        setRawOptions(options);

        // 🟢 МАССОВАЯ ПРОВЕРКА ДОСТУПНОСТИ ВСЕХ ТАРИФОВ ОДНОВРЕМЕННО
        if (options && options.length > 0) {
          const availPromises = options.map(async (opt) => {
            const check = await fetchTourAvailability({
              tourId: tourid,
              tourOptionId: opt.tourOptionId,
              transferId: opt.transferId,
              travelDate: checkInParam,
              adults: adultsTotal,
              children: childsTotal,
              infants: infants
            });
            return {
              tourOptionId: opt.tourOptionId,
              transferId: opt.transferId,
              status: check.status,
              message: check.message
            };
          });

          const availResults = await Promise.all(availPromises);
          setAvailabilityData(availResults);
        }

        if (options && options.length > 0) {
          setTransfer(options[0].transferId);
        }
      } catch (err) {
        setError('Failed to load tour details');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [id]);

  // --- ОПТИМИЗАЦИЯ: Передаем массив availabilityData в процессор данных ---
  const processedOptions = useMemo(() => {
    // Теперь процессор берет и скидки, и данные о доступности!
    return processTourData(rawOptions, staticData, dbDiscounts, availabilityData);
  }, [rawOptions, staticData, dbDiscounts, availabilityData]);

  // --- ЭФФЕКТ 2: Обновление цен при изменении счетчиков гостей ---
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
      if (ty === "adult") setAdultsTotal(c);
      if (ty === "child") setChildsTotal(c);
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
    const comission = 1 + 15 / 100;
    const newItem = {
      tourId: tourid,
      optionId: option.tourOptionId,
      transferId: option.transferId,
      optionName: optionName,
      tourName: tur,
      tourDate: checkInParam,
      tourTime: slotId?.time || "10:00",
      slotId: slotId?.id || 0,
      adult: adultsTotal,
      child: childsTotal,
      adultb2b: option.adultPrice,
      adultb2c: Math.round(option.adultPrice * comission),
      childb2b: option.childPrice,
      childb2c: option.childPrice * comission,
      b2cTotal: rateTotal,
      b2bTotal:
        option.adultPrice * adultsTotal + option.childPrice * childsTotal,
      referNo: Math.floor(100000 + Math.random() * 900000),
      uniqNo: Math.floor(100000 + Math.random() * 900000),
      leadPassangers: adultsTotal + childsTotal,
      city: city,
    };
    const next = [...cartItem, newItem];
    setcartItem(next);
    navigate("/toursbookpage/", { state: { cardItem: next } });
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
            {loading && rawOptions.length === 0 ? (
              <div className="option-not">
                <Loader />
                <span>Please wait..</span>
              </div>
            ) : !Array.isArray(filteredOptions) ||
              filteredOptions.length === 0 ? (
              <div className="option-not">
                < NotInterestedOutlined/>
                <h3>Nothing found matching your request</h3>
                <span>Please specify other search parameters</span>
              </div>
            ) : (
                          filteredOptions.map((opt, index) => {
                const adultTotal =
                  totals.find(
                    (it) =>
                      it.id === opt.tourOptionId + "adult" + opt.transferId,
                  )?.total || 0;
                const childTotal =
                  totals.find(
                    (it) =>
                      it.id === opt.tourOptionId + "child" + opt.transferId,
                  )?.total || 0;
                const rateTotal = adultTotal + childTotal;
                const isSlot = opt.isSlot || false;
                const slotDisabled =
                  selectedSlot.opId !== opt.tourOptionId || null;

                return (
                  /* 🟢 Если тариф недоступен, делаем блок полупрозрачным */
                  <div
                    className={`option-box ${!opt.isAvailable ? "tour-disabled" : ""}`}
                    key={`${opt.tourOptionId}-${opt.transferId}-${index}`}
                    style={{ opacity: !opt.isAvailable ? 0.5 : 1, transition: 'all 0.3s' }}
                  >
                    <div className="option-info">
                      <h4>
                        {opt.optionName} - {opt.tourOptionId} - {opt.transferId}
                      </h4>

                      {/* 🟢 КРАСИВЫЙ БЛОК ОШИБКИ ИЗ API RAYNA TOUR */}
                      {!opt.isAvailable && (
                        <div className="availability-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d4f', fontSize: '13px', marginTop: '10px', background: 'rgba(255, 77, 79, 0.08)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 77, 79, 0.15)', textAlign: 'left' }}>
                          <ErrorOutlined style={{ fontSize: '18px' }} />
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
                          count={quests}
                        />
                      )}
                    </div>
                    <div className="rate-box">
                      <div className="rate-item">
                        <div className="rate-guest">
                          <People />
                          <span>Adult price: {opt.prices.adult} AED</span>
                        </div>
                        <div className="inforate">
                          <div
                            className="rate-counter"
                            id={opt.tourOptionId + "adult"}
                          >
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
                              count={10}
                              price={opt.prices.adult}
                              rateCount={opt.isAvailable ? adultsTotal : 0}
                              disabled={!opt.isAvailable}
                            />
                          </div>
                          <div className="rprice">
                            <h4>{opt.isAvailable ? adultTotal : 0}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="rate-item">
                        <div className="rate-guest">
                          <FamilyRestroom/>
                          <span>Child price: {opt.prices.child} AED</span>
                        </div>
                        <div className="inforate">
                          <div
                            className="rate-counter"
                            id={opt.tourOptionId + "child"}
                          >
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
                              count={10}
                              price={opt.prices.child}
                              rateCount={opt.isAvailable ? childsTotal : 0}
                              disabled={!opt.isAvailable}
                            />
                          </div>
                          <div className="rprice">
                            <h4>{opt.isAvailable ? childTotal : 0}</h4>
                          </div>
                        </div>
                      </div>

                      <div className="rate-button">
                        <h2>
                          Total{" "}
                          {!opt.isAvailable 
                            ? "0.00" 
                            : (opt.transferId === 41865 ? rateTotal : opt.prices.totalAuto)}{" "}
                          AED
                        </h2>
                        
                        {/* 🟢 БЛОКИРУЕМ КНОПКУ, ЕСЛИ ТАРИФ НЕ ДОСТУПЕН */}
                        <button
                          disabled={(isSlot === true && slotDisabled) || !opt.isAvailable}
                          onClick={() =>
                            addToCart(
                              opt,
                              rateTotal,
                              opt.optionName,
                              selectedSlot || 0,
                            )
                          }
                          style={{
                            backgroundColor: !opt.isAvailable ? '#2d3748' : '',
                            color: !opt.isAvailable ? '#a0aec0' : '',
                            cursor: !opt.isAvailable ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {!opt.isAvailable ? "Not Available" : "Buy Now"}
                        </button>
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
