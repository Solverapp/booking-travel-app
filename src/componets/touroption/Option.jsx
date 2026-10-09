
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchTourOptions, fetchTourStatic, processTourData } from '../../services/raynaService';

import "./style.css";
import transferData from "../../mock/transfers";
import Loader from "../loaders/loading";
import Slots from "../slots/Slots";
import OptionData from "../../mock/option";
import RateConter from "../Tourguest/guestCounter";
import guest from "../../img/icons/Hotelicons/Guest.svg";




const Rates = ({id,tur}) => {
  
  const tourid = id;
  const tName = tur;
  const [searchParams, setSearchParams] = useSearchParams();
  const city = searchParams.get("city");
  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");
  const adultsParams = searchParams.get("adults");
  const childrenParams = searchParams.get("children");
  const infantsParams = searchParams.get("infants");
  const adults = parseInt(adultsParams);
  const childern = parseInt(childrenParams);
  const infants = parseInt(infantsParams);
  const quests = adults + childern + infants;
  const checkIn = checkInParam ? new Date(checkInParam) : null;
  const checkOut = checkOutParam ? new Date(checkOutParam) : null;
  const customOptions = OptionData;
  


  
  
  
const API_KEY =
  "Bearer eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YzFlYzJmMC01ZjcwLTRhMzQtYjk2Yy00ZTNiNjc0NWQ3MTkiLCJVc2VySWQiOiI1MDk0MCIsIlVzZXJUeXBlIjoiQWdlbnQiLCJQYXJlbnRJRCI6IjAiLCJFbWFpbElEIjoic29sdmVyLmN1c3RvbWVyc0BnbWFpbC5jb20iLCJpc3MiOiJodHRwOi8vcmF5bmF3ZWJhcGlhd3MucmF5bmF0b3Vycy5jb20iLCJhdWQiOiJodHRwOi8vcmF5bmF3ZWJhcGlhd3MucmF5bmF0b3Vycy5jb20ifQ.s-eCu52tC5VnudmyYMITfKUIhBDJosNV8GIkRT04kh8";
const [option, setOption] = useState([]);
  const [optionStatic, setOptionStatic] = useState([]);
  const [transfer, setTransfer] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adultsTotal, setAdultsTotal] = useState(adults);
  const [childsTotal, setChildsTotal] = useState(childern);
  

  const activTab = (tab) => {
    setTransfer(tab)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [optionRes, optionStaticRes] = await Promise.all([
          fetch("https://activities.raynatours.com/api/Tour/touroption", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: API_KEY,
            },
            body: JSON.stringify({
              tourId: tourid,
              contractId: 300,
              travelDate: checkInParam,
              noOfAdult: adultsTotal,
              noOfChild: childsTotal,
              noOfInfant: infants,
            }),
          }),
          fetch(
            "https://activities.raynatours.com/api/Tour/touroptionstaticdata",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: API_KEY,
              },
              body: JSON.stringify({
                tourId: tourid,
                contractId: 300,
              }),
            },
          ),
        ]);

        const optionData = await optionRes.json();
        const optionStaticData = await optionStaticRes.json();
        
        if (optionData.result) {
          setOption(optionData.result);
          setTransfer(optionData.result[0].transferId)
        }

        if (optionStaticData.result) {
          setOptionStatic(optionStaticData.result.touroption);
        }
      } catch (err) {
        setError('Failed to load hotel details');
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchNewData = async () => {
      setLoading(true);
      try {
        const [optionNewRes] = await Promise.all([
          fetch("https://activities.raynatours.com/api/Tour/touroption", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: API_KEY,
            },
            body: JSON.stringify({
              tourId: tourid,
              contractId: 300,
              travelDate: checkInParam,
              noOfAdult: adultsTotal,
              noOfChild: childsTotal,
              noOfInfant: infants,
            }),
          }),
        ]);
        const optionData = await optionNewRes.json();
        if (optionData.result) {
          setOption(optionData.result);
        }
      } catch (err) {
        setError('Failed to load rates details');
      }
      setLoading(false);
    };
    fetchNewData();
  }, [adultsTotal, childsTotal]);

let filtredOption =  option.filter((tr) => tr.transferId === transfer) || option ;
const availableTransferIds = new Set(option.map((op) => op.transferId));
const comission = (1 + (15 / 100));
const [totals, setTotals] = useState([]);
const [selectedSlot, setSelectedSlot] = useState([]);
 const [cartItem, setcartItem] = useState([]);

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
   const ty = type

   setTotals((prev) => {
    if (ty === 'adult') {setAdultsTotal(c)};
    if (ty === 'child') {setChildsTotal(c)};
     const exists = prev.some((item) => item.id === key);

     if (exists) {
       return prev.map((item) =>
         item.id === key ? { ...item, qty: c, price: p, total: t } : item,
       );
     }

     return [...prev, { id: key, qty: c, total: t, price: p, type: ty }];
   });
 };
  const navigate = useNavigate();
 const addToCart = (option, rateTotal, optionName, slotId) => {
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
        <div className={`transferoption ${option.length === 0 ? "hiden" : ""}`}>
          {filtredOption.length > 0 ? (
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
            {loading ? (
            <div className="option-not">
              <Loader />
              <span>Please wait..</span>
            </div>
              
            ) : !Array.isArray(filtredOption) || filtredOption.length === 0 ? (
              <div className="option-not">
                <img src={guest} alt="hotel" />
                <h3>Nothing found matching your request</h3>
                <span>Please specify other search parameters</span>
              </div>
            ) : (
              filtredOption.map((option, index) => {
                const normalizeId = (value) => String(value ?? "").trim();
                const customOption = customOptions.find((cprice) => normalizeId(cprice.tourOptionId) === normalizeId(option.tourOptionId) && cprice.transferId === option.transferId);
                const optionName = optionStatic.find((value) => value.tourOptionId === option.tourOptionId,).optionName;
                const customAdultPrice = customOption?.adultSellingPrice ?? 0 ; 
                const customChildPrice = customOption?.childSellingPrice ?? 0; 
                const adultTotal = totals.find((it) => it.id ===option.tourOptionId + "adult" + option.transferId)?.total || 0;
                const childTotal = totals.find((it) => it.id === option.tourOptionId + "child" + option.transferId) ?.total || 0;
                const rateTotal = adultTotal + childTotal;
                const isSlot = option.isSlot || false;
                const slotId = selectedSlot.opId !== option.tourOptionId || null;
                const roundTo = function(num, places) {
  const factor = 10 ** places;
  return Math.round(num * factor) / factor;};



                
                return (
                  <div className="option-box" key={`${index}`}>
                    <div className="option-info">
                      <h4>{optionName}- {option.tourOptionId} - {option.transferId}</h4>

                      {isSlot === true ? (<Slots 
                      option ={option} 
                      traveldate = {checkInParam}
                      isSlot = {true}
                      selectedSlot = {selectedSlot}
                      handleSlotToggle = {handleSlotToggle}
                      setSelectedSlot = {setSelectedSlot}
                      count = {quests}
                      />) : null }
                      
                    </div>
                    <div className="rate-box">
                      <div className="rate-item">
                        <div className="rate-guest">
                          <img src={guest} alt="adult" />
                          <span>
                            Adult price:
                            
                            {customAdultPrice > 0 ? customAdultPrice : roundTo(option.adultPrice * comission, 2)} AED
                            {/* {Math.round(option.adultPrice * comission)} AED */}
                          </span>
                        </div>
                        <div className="inforate">
                          
                          <div className="rate-counter" id={option.tourOptionId + "adult"}>
                           <RateConter
                            id={option.tourOptionId + "adult" + option.transferId }
                            onRoomChange={(newCounts, newPrice, type) =>
                              handleCounthange(
                                option.tourOptionId +"adult" + option.transferId,
                                newCounts,
                                newPrice,
                                (type = "adult"),)}
                            count={10}
                            price={customAdultPrice > 0 ? customAdultPrice : roundTo(option.adultPrice * comission, 2)}
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
                          <img src={guest} alt="adult" />
                          <span>
                            Child price:{" "}
                            {customChildPrice > 0 ? customChildPrice : roundTo(option.childPrice * comission, 2)} AED
                          </span>
                        </div>
                        <div className="inforate">
                          <div className="rate-counter" id={option.tourOptionId + "child"}>
                            <RateConter
                              id={option.tourOptionId + "child" + option.transferId}
                              onRoomChange={(newCounts, newPrice, type) =>
                                handleCounthange(
                                  option.tourOptionId + "child" + option.transferId,
                                  newCounts,
                                  newPrice,
                                  (type = "child"),)}
                                  count={10}
                                  price={customChildPrice > 0 ? customChildPrice : option.childPrice * comission}
                                  rateCount={childsTotal}
                            />
                          </div>
                          <div className="rprice">
                            <h4>{childTotal}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="rate-button">
                        <h2>Total {option.transferId === 41865 ? rateTotal : roundTo(option.finalAmount * comission)} AED</h2>
                        <button disabled= {isSlot===true && slotId } onClick={() => addToCart(option,rateTotal,optionName, selectedSlot || 0 )} >Buy Now </button>
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

