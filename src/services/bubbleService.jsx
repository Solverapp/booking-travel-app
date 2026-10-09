const BUBBLE_BASE_URL = "https://solver-14372.bubbleapps.io/version-live/api/1.1/obj";

// Хелпер для обработки ответов
async function handleResponse(res) {
  if (!res.ok) {
    throw new Error(`Bubble API Error: ${res.status}`);
  }
  const data = await res.json();
  return data?.response?.results ?? [];
}

export const bubbleService = {
  /**
   * Получение списка туров по названию города
   * @param {string} city - название города (например, "Dubai")
   */
  async fetchToursByCity(city) {
    const targetCity = city || "Dubai";
    const encodedCity = encodeURIComponent(targetCity);
    
    // Переносим вашу структуру constraints прямо сюда
    const constraints = JSON.stringify([{ key: "cityname", constraint_type: "equals", value: encodedCity }]);
    const url = `${BUBBLE_BASE_URL}/TourData?constraints=${constraints}`;
    
    const response = await fetch(url);
    return handleResponse(response);
  }
};
