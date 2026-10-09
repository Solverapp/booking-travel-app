const BASE_URL = "https://api.liteapi.travel/v3.0/data";
const API_KEY = import.meta.env.VITE_LITE_API_KEY;

// Хелпер для обработки ошибок
async function handleResponse(res) {
  if (!res.ok) throw new Error(`Lite API Error: ${res.status}`);
  const data = await res.json();
  return data.data;
}

export const placesService = {
  /**
   * 1. Получение списка места (Plase)
   */
  async fetchPlacesList(params) {
    const res = await fetch(`${BASE_URL}/places?textQuery=${params.query}&type=political%2Clocality%2Cgeocode`, {
      method: "GET",
      headers: { "Content-Type": "application/json" ,
        'X-API-Key': API_KEY,
      },
      
    });
    return handleResponse(res);
  },


};
