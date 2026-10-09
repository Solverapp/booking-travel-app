// Внутренняя функция для форматирования в yyyy-mm-dd с учетом локального времени
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 1. Получаем завтрашний день (текущая дата + 1 день)
const tomorrowObj = new Date();
tomorrowObj.setDate(tomorrowObj.getDate() + 1);
const tomorrow = formatDate(tomorrowObj);

// 2. Получаем дату: завтрашний день + 2 дня (итого +3 дня от сегодня)
const afterTomorrowObj = new Date(tomorrowObj);
afterTomorrowObj.setDate(afterTomorrowObj.getDate() + 2);
const dayAfterTomorrow = formatDate(afterTomorrowObj);

// Экспортируем обе константы по умолчанию
export default {
  tomorrow,
  dayAfterTomorrow,
};
