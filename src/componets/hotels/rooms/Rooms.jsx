
import { useEffect, useState } from "react";
import "./style.css";
import {RoundedCorner, People, Wifi, LocalParking, AcUnit, FitnessCenter, Pool, SmokeFree, TaskAlt, Tv, CoffeeMaker, ShoppingCart} from '@mui/icons-material'
import meals from "../../../img/icons/Hotelicons/meals.svg";
import bed from "../../../img/icons/Hotelicons/bed.svg";


const Rooms = (hotel,  rates ) => {
  const roomsdata = hotel.rooms;
  const roomRates = hotel.rates;
  const getRoomImage = (mappedRoomId) => {
    if (!hotel?.rooms) return null;
    const room = roomsdata.find(r => r.id === mappedRoomId);
    if (room?.photos && room.photos.length > 0) {
      return room.photos[0].url;
    }
    return hotel?.main_photo;
  };

  const groupRatesByRoom = () => {
    const grouped  = {};
       roomRates.forEach(rt => {
      rt.rates.forEach(rate => {
        const roomId = rate.mappedRoomId;
        if (!grouped[roomId]) {
          grouped[roomId] = [];
        }
        grouped[roomId].push({
          roomName: rate.name,
          image: getRoomImage(roomId) || '',
          offerId: rt.offerId,
          rate,
        });
      });
    });
    const roomInfo = ((roomId) => roomsdata.filter((rd) => rd.id === roomId))
    return Object.entries(grouped).map(([id, data]) => ({
      roomId: parseInt(id),
      roomInfos: roomsdata.filter((rd) => rd.id === parseInt(id, 10)),
      offers: data,
    }));
  };
  const allRooms = groupRatesByRoom()
  
const facilityIcons = [
  { keywords: ["wifi"], icon: Wifi },
  { keywords: ["fitness"], icon: FitnessCenter },
  { keywords: ["parking"], icon: LocalParking },
  { keywords: ["pool"], icon: Pool },
  { keywords: ["conditioning"], icon: AcUnit },
  { keywords: ["smoking"], icon: SmokeFree },
  { keywords: ["tv"], icon: Tv },
  { keywords: ["coffee"], icon: CoffeeMaker },
];

const getFacilityIcon = (name) => {
  const word = name.toLowerCase();
  const match = facilityIcons.find(({ keywords }) =>
    keywords.some((key) => word.includes(key))
  );

  const Icon = match?.icon || TaskAlt;
  return <Icon />;
};
console.log(allRooms);

  return (
    <div className="rcontainer">
      <div className="content">
        <h2>Available rooms</h2>
        <div className="content-row">
          <div className="room-content">
            {allRooms.map((room) => { 
            const roomName = room.offers[0]?.roomName;
            const roomSqu = room.roomInfos[0].roomSizeSquare;
            const roomSquSize = room.roomInfos[0].roomSizeUnit;
            const maxGuest = room.roomInfos[0].maxAdults + room.roomInfos[0].maxChildren;

             return(
            
              <div className="rooms-item" key={`${room.roomId}`}>
                <div className="romm-item-info">
                  <span>Only 5 rooms left on our website</span>
                  <img src={room.offers[0].image} alt="" />
                  <h4>{`${roomName}`}</h4>
                  <div className="romm-info-detalis">
                    <p>Romm detalis</p>
                    <div className="detalis-heder">
                      <div className="detalis-heder-item">
                        <RoundedCorner/>
                        <span>{roomSqu} {roomSquSize}</span>
                      </div>
                      <div className="detalis-heder-item">
                        <People/>
                        <span>Sleep {maxGuest}</span>
                      </div>
                    </div>
                    <p>Romm amenitets</p>
                    <div className="amenites-box">
                      {room.roomInfos[0].roomAmenities.slice(0, 6).map((amenitet) => {
                        return(
               <button className="amenites-btn" key={amenitet.amenitiesId}>
                {getFacilityIcon(amenitet.name)} 
                 <span>{amenitet.name}</span>
                 </button>
                  )
                      })}
                    </div>
                  </div>
                </div>
                <div className="rate-box">
                                  {room.offers.map((item, idx) => {
                                    const key = `${idx}`;
                                    const bedroom = room.roomInfos[0];
                                    const ratePrice = item.rate.retailRate?.total?.[0]?.amount?.toFixed(2) || 'N/A';
                                    return (
                                      <div className="rates-item" key={key}>
                                        <div className="infoitem">
                                          <div className="infoprice">
                                            
                                            <h2>{`${ratePrice}`} AED</h2>
                                            <span>Including taxes and fees</span>
                                            <div className="canseletion">
                                              <span className={`rfn ${
                              item.rate.cancellationPolicies.refundableTag === "RFN"
                                ? "rf" : ""
                            }`}>{item.rate.cancellationPolicies.refundableTag === 'RFN' ?  `Refund to ${item.rate.cancellationPolicies.cancelPolicyInfos[0].cancelTime

}`  : 'Non-refundable'}</span>
                                            </div>
                                          </div>
                                          <div className="rate-amenit">
                                            <button>
                                              <img src={meals} alt="meals" />
                                              <span>{item.rate.boardName}</span>
                                            </button>
                                            <button>
                                              <img src={bed} alt="bed" />
                                              <span>{bedroom.bedTypes[0].bedType}</span>
                                            </button>
                                          </div>
                                          
                                        </div>
                                        <div className="addCard">
                                          <button>
                                            <ShoppingCart/>
                                            Buy Now
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rooms;

