const BASE_URL = "https://api.liteapi.travel/v3.0";
const API_KEY = import.meta.env.VITE_LITE_API_KEY;

// Хелпер для обработки ошибок
async function handleResponse(res) {
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const hotelService = {
  /**
   * 1. Получение списка отелей места (Rates_Plase)
   */
  async fetchHotelsList(params) {
    const res = await fetch(`${BASE_URL}/hotels/rates`, {
      method: "POST",
      headers: {
        'X-API-Key': API_KEY,
        'accept': 'application/json',
        'content-type': 'application/json'},
      body: JSON.stringify(params
      ),
    });
    return handleResponse(res);
  },

  
  
};
