const BASE_URL = "https://activities.raynatours.com/api/Tour";
const API_KEY = import.meta.env.VITE_RAYNA_API_KEY;

export const COMISSION = 1 + (15 / 100);

// Хелпер для округления цен
export const roundTo = (num, places = 2) => {
  const factor = 10 ** places;
  return Math.round(num * factor) / factor;
};

// 1. Запрос динамических опций и цен (из useEffect)
export async function fetchTourOptions(params) {
  const response = await fetch(`${BASE_URL}/touroption`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: JSON.stringify({
      tourId: params.tourId,
      contractId: 300,
      travelDate: params.travelDate,
      noOfAdult: params.adults,
      noOfChild: params.children,
      noOfInfant: params.infants,
    }),
  });

  if (!response.ok) throw new Error("Failed to fetch tour options");
  const data = await response.json();
  return data.result || [];
}

// 2. Запрос статических данных тура (названия тарифов)
export async function fetchTourStatic(tourId) {
  const response = await fetch(`${BASE_URL}/touroptionstaticdata`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: JSON.stringify({
      tourId: tourId,
      contractId: 300,
    }),
  });

  if (!response.ok) throw new Error("Failed to fetch static data");
  const data = await response.json();
  return data.result?.touroption || [];
}

// 3. Запрос тайм-слотов для компонента Slots
export async function fetchTourSlots(params) {
  const response = await fetch(`${BASE_URL}/timeslot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: JSON.stringify({
      tourId: params.tourId,
      contractId: 300,
      travelDate: params.travelDate,
      tourOptionId: params.tourOptionId,
      transferId: params.transferId,
    }),
  });

  if (!response.ok) throw new Error("Failed to fetch time slots");
  const data = await response.json();
  return Array.isArray(data?.result) ? data.result : [];
}

// 4. Процессор данных: склеивает сырые опции со статикой и кастомными наценками
export function processTourData(options, staticData, customOptions) {
  const normalizeId = (value) => String(value ?? "").trim();

  return options.map((opt) => {
    // Находим красивое статическое имя тарифа
    const staticInfo = staticData.find((s) => s.tourOptionId === opt.tourOptionId);
    
    // Ищем, есть ли для этого тарифа специальные фиксированные цены в mock/option.js
    const customOpt = customOptions.find(
      (cprice) =>
        normalizeId(cprice.tourOptionId) === normalizeId(opt.tourOptionId) &&
        cprice.transferId === opt.transferId
    );

    // Рассчитываем итоговую b2c стоимость взрослого билета
    const finalAdultPrice = customOpt?.adultSellingPrice > 0 
      ? customOpt.adultSellingPrice 
      : roundTo(opt.adultPrice * COMISSION);

    // Рассчитываем итоговую b2c стоимость детского билета
    const finalChildPrice = customOpt?.childSellingPrice > 0 
      ? customOpt.childSellingPrice 
      : roundTo(opt.childPrice * COMISSION);

    return {
      ...opt,
      optionName: staticInfo?.optionName || "Unknown Option",
      prices: {
        adult: finalAdultPrice,
        child: finalChildPrice,
        totalAuto: roundTo(opt.finalAmount * COMISSION),
      },
    };
  });
}
