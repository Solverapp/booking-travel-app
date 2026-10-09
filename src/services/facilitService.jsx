const BASE_URL = "https://api.liteapi.travel/v3.0";
const API_KEY = import.meta.env.VITE_LITE_API_KEY;

// Хелпер для обработки ошибок
async function handleResponse(res) {
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
  console.log(res);
  
}

export const facilitService = {
  /**
   * 1. Получение списка отелей места (Rates_Plase)
   */
  
  async fetchFacilitiesList() {
    const res = await fetch(`${BASE_URL}/data/facilities?lang=en`, {
      method: "GET",
      headers: {'X-API-Key': API_KEY, 'accept': 'application/json' },
    });
    
    return handleResponse(res);
  }
};
