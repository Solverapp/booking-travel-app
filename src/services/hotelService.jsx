const BASE_URL = "https://x8ki-letl-twmt.n7.xano.io/api:mJRCJ-pi";

// Хелпер для обработки ошибок
async function handleResponse(res) {
  if (!res.ok) throw new Error(`Xano API Error: ${res.status}`);
  const data = await res.json();
  return data?.final_hotels ?? [];
}

export const hotelService = {
  /**
   * 1. Получение списка отелей места (Rates_Plase)
   */
  async fetchHotelsList(params) {
    const res = await fetch(`${BASE_URL}/Rates_Plase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId: params.placeId,
        CheckInDate: params.checkInDate,
        CheckOutDate: params.checkOutDate,
        currency: "AED",
        national: "RU",
        limit: 40,
        margin: 10,
        questjson: {
          adults: params.adults,
          children: params.children,
        },
      }),
    });
    return handleResponse(res);
  },

  /**
   * 2. Получение детальной информации отеля (Rates_Hotel)
   */
  async fetchHotelDetails(params) {
    const res = await fetch(`${BASE_URL}/Rates_Hotel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: params.hotelId,
        CheckInDate: params.checkInDate,
        CheckOutDate: params.checkOutDate,
        currency: "AED",
        national: "RU",
        lang: "en",
        margin: 10,
        questjson: {
          adults: params.adults,
        },
      }),
    });
    
    if (!res.ok) throw new Error(`Xano API Error: ${res.status}`);
    const data = await res.json();
    return data?.final_hotels || null;
  }
};
