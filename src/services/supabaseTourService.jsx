import { supabase } from "../supabaseClient";

// Обратите внимание на слово export перед const
export const supabaseTourService = {
  /**
   * 1. Получение списка туров по названию города (замена Bubble.io)
   */
  async fetchToursByCity(city) {
    const targetCity = city || "Dubai";
    
    const { data, error } = await supabase
      .from('tours_static')
      .select('*')
      .eq('cityName', targetCity);

    if (error) {
      console.error("Error fetching tours from Supabase:", error.message);
      throw new Error(error.message);
    }
    return data || [];
  },

  /**
   * 2. Получение кастомных промо-тарифов со скидками из Supabase
   */
  async fetchDiscountRates(tourId) {
    const { data, error } = await supabase
      .from('tour_discount_rates')
      .select('*')
      .eq('tour_id', String(tourId))
      .eq('is_active', true);

    if (error) {
      console.error("Error fetching discount rates from Supabase:", error.message);
      return [];
    }
    return data || [];
  }
};
