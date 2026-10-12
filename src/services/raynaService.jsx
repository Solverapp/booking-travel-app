import { supabase } from "../supabaseClient";

const BASE_URL = "https://activities.raynatours.com/api/Tour";
export const COMISSION = 1 + (15 / 100);

export const roundTo = (num, places = 2) => {
  const factor = 10 ** places;
  return Math.round(num * factor) / factor;
};

// 🟢 1. НОВЫЙ МЕТОД: Проверка доступности тарифа через Supabase шлюз
export async function fetchTourAvailability(params) {
  try {
    const response = await supabase.functions.invoke('liteapi-proxy', {
      method: 'POST',
      headers: {
        'x-target-url': `${BASE_URL}/availability`,
        'x-service-type': 'tours'
      },
      body: {
        tourId: Number(params.tourId),
        tourOptionId: Number(params.tourOptionId),
        transferId: Number(params.transferId),
        travelDate: params.travelDate,
        adult: Number(params.adults || 1),
        child: Number(params.children || 0),
        infant: Number(params.infants || 0),
        contractId: 300
      }
    });

    if (response.error) {
      return { status: "error", message: "Availability check failed" };
    }

    const resObj = response.data?.result;
    
    // Приводим к строке и очищаем от пробелов
    const status = String(resObj?.status || "").toLowerCase().trim();

    console.log(`Фильтрованный статус для опции ${params.tourOptionId}:`, status);

    // 🟢 УЛУЧШЕННОЕ УСЛОВИЕ: Считаем доступным, если статус "success", "1" или "true"
    const isSuccess = status === "success" || status === "1" || status === "true";

    return {
      status: isSuccess ? "success" : "unavailable",
      message: resObj?.message || "This option is currently not available."
    };
  } catch (err) {
    return { status: "error", message: "System error checking availability" };
  }
}

// 2. Безопасный запрос динамических опций и цен через Supabase
export async function fetchTourOptions(params) {
  const response = await supabase.functions.invoke('liteapi-proxy', {
    method: 'POST',
    headers: {
      'x-target-url': `${BASE_URL}/touroption`,
      'x-service-type': 'tours'
    },
    body: {
      tourId: params.tourId,
      contractId: 300,
      travelDate: params.travelDate,
      noOfAdult: params.adults,
      noOfChild: params.children,
      noOfInfant: params.infants,
    }
  });

  if (response.error) throw new Error(`Supabase Error: ${response.error.message}`);
  return response.data?.result || [];
}

// 3. Безопасный запрос статических данных тура через Supabase
export async function fetchTourStatic(tourId) {
  const response = await supabase.functions.invoke('liteapi-proxy', {
    method: 'POST',
    headers: {
      'x-target-url': `${BASE_URL}/touroptionstaticdata`,
      'x-service-type': 'tours'
    },
    body: {
      tourId: tourId,
      contractId: 300,
    }
  });

  if (response.error) throw new Error(`Supabase Error: ${response.error.message}`);
  return response.data?.result?.touroption || [];
}

// 4. Безопасный запрос тайм-слотов через Supabase
export async function fetchTourSlots(params) {
  const response = await supabase.functions.invoke('liteapi-proxy', {
    method: 'POST',
    headers: {
      'x-target-url': `${BASE_URL}/timeslot`,
      'x-service-type': 'tours'
    },
    body: {
      tourId: params.tourId,
      contractId: 300,
      travelDate: params.travelDate,
      tourOptionId: params.tourOptionId,
      transferId: params.transferId,
    }
  });

  if (response.error) throw new Error(`Supabase Error: ${response.error.message}`);
  return Array.isArray(response.data?.result) ? response.data.result : [];
}

// 🟢 5. ОБНОВЛЕННЫЙ ПРОЦЕССОР ДАННЫХ: Принимает массив результатов доступности
export function processTourData(options, staticData, dbDiscounts = [], availabilityList = []) {
  const cleanId = (value) => String(value ?? "").trim().toLowerCase();

  return options.map((opt) => {
    const staticInfo = staticData.find((s) => cleanId(s.tourOptionId) === cleanId(opt.tourOptionId));
    
    // Сверяем скидки Supabase
    const discountOpt = dbDiscounts.find(
      (d) => cleanId(d.tour_option_id) === cleanId(opt.tourOptionId)
    );

    // 1. НАХОДИМ РЕЗУЛЬТАТ ДОСТУПНОСТИ СТРОГО ПО tourOptionId
    const availCheck = availabilityList && availabilityList.length > 0
      ? availabilityList.find(
          (a) => cleanId(a.tourOptionId) === cleanId(opt.tourOptionId)
        )
      : null;

    // 2. 🟢 ИСПРАВЛЕНИЕ: Если данных о доступности ЕЩЕ НЕТ в стейте (массив пустой),
    // то по умолчанию ставим true (доступен). Как только API ответит — подставится реальный статус!
    const isAvailable = availabilityList && availabilityList.length > 0
      ? (availCheck ? availCheck.status === "success" : false)
      : true;

    const finalAdultPrice = discountOpt?.discount_adult_price > 0 
      ? Number(discountOpt.discount_adult_price)
      : roundTo(opt.adultPrice * COMISSION);

    const finalChildPrice = discountOpt?.discount_child_price > 0 
      ? Number(discountOpt.discount_child_price)
      : roundTo(opt.childPrice * COMISSION);

    return {
      ...opt,
      optionName: staticInfo?.optionName || "Unknown Option",
      isAvailable: isAvailable, // Наш защищенный флаг
      availabilityMessage: availCheck && availCheck.status !== "success" ? availCheck.message : "",
      prices: {
        adult: finalAdultPrice,
        child: finalChildPrice,
        totalAuto: roundTo((finalAdultPrice * (opt.noOfAdult || 1)) + (finalChildPrice * (opt.noOfChild || 0))),
      },
    };
  });
}