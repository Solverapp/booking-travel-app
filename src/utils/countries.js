export const COUNTRIES = [
  { code: "DZ", name: "Algeria", dial: "213" },
  { code: "AR", name: "Argentina", dial: "54" },
  { code: "AM", name: "Armenia", dial: "374" },
  { code: "AU", name: "Australia", dial: "61" },
  { code: "AT", name: "Austria", dial: "43" },
  { code: "AZ", name: "Azerbaijan", dial: "994" },
  { code: "BH", name: "Bahrain", dial: "973" },
  { code: "BD", name: "Bangladesh", dial: "880" },
  { code: "BY", name: "Belarus", dial: "375" },
  { code: "BE", name: "Belgium", dial: "32" },
  { code: "BR", name: "Brazil", dial: "55" },
  { code: "BG", name: "Bulgaria", dial: "359" },
  { code: "CA", name: "Canada", dial: "1" },
  { code: "CN", name: "China", dial: "86" },
  { code: "HR", name: "Croatia", dial: "385" },
  { code: "CY", name: "Cyprus", dial: "357" },
  { code: "CZ", name: "Czech Republic", dial: "420" },
  { code: "DK", name: "Denmark", dial: "45" },
  { code: "EG", name: "Egypt", dial: "20" },
  { code: "EE", name: "Estonia", dial: "372" },
  { code: "FI", name: "Finland", dial: "358" },
  { code: "FR", name: "France", dial: "33" },
  { code: "GE", name: "Georgia", dial: "995" },
  { code: "DE", name: "Germany", dial: "49" },
  { code: "GR", name: "Greece", dial: "30" },
  { code: "HU", name: "Hungary", dial: "36" },
  { code: "IS", name: "Iceland", dial: "354" },
  { code: "IN", name: "India", dial: "91" },
  { code: "ID", name: "Indonesia", dial: "62" },
  { code: "IR", name: "Iran", dial: "98" },
  { code: "IQ", name: "Iraq", dial: "964" },
  { code: "IE", name: "Ireland", dial: "353" },
  { code: "IL", name: "Israel", dial: "972" },
  { code: "IT", name: "Italy", dial: "39" },
  { code: "JP", name: "Japan", dial: "81" },
  { code: "JO", name: "Jordan", dial: "962" },
  { code: "KZ", name: "Kazakhstan", dial: "7" },
  { code: "KE", name: "Kenya", dial: "254" },
  { code: "KW", name: "Kuwait", dial: "965" },
  { code: "KG", name: "Kyrgyzstan", dial: "996" },
  { code: "LV", name: "Latvia", dial: "371" },
  { code: "LB", name: "Lebanon", dial: "961" },
  { code: "LT", name: "Lithuania", dial: "370" },
  { code: "LU", name: "Luxembourg", dial: "352" },
  { code: "MY", name: "Malaysia", dial: "60" },
  { code: "MT", name: "Malta", dial: "356" },
  { code: "MX", name: "Mexico", dial: "52" },
  { code: "MD", name: "Moldova", dial: "373" },
  { code: "MA", name: "Morocco", dial: "212" },
  { code: "NP", name: "Nepal", dial: "977" },
  { code: "NL", name: "Netherlands", dial: "31" },
  { code: "NZ", name: "New Zealand", dial: "64" },
  { code: "NG", name: "Nigeria", dial: "234" },
  { code: "NO", name: "Norway", dial: "47" },
  { code: "OM", name: "Oman", dial: "968" },
  { code: "PK", name: "Pakistan", dial: "92" },
  { code: "PH", name: "Philippines", dial: "63" },
  { code: "PL", name: "Poland", dial: "48" },
  { code: "PT", name: "Portugal", dial: "351" },
  { code: "QA", name: "Qatar", dial: "974" },
  { code: "RO", name: "Romania", dial: "40" },
  { code: "RU", name: "Russia", dial: "7" },
  { code: "SA", name: "Saudi Arabia", dial: "966" },
  { code: "RS", name: "Serbia", dial: "381" },
  { code: "SG", name: "Singapore", dial: "65" },
  { code: "SK", name: "Slovakia", dial: "421" },
  { code: "SI", name: "Slovenia", dial: "386" },
  { code: "ZA", name: "South Africa", dial: "27" },
  { code: "KR", name: "South Korea", dial: "82" },
  { code: "ES", name: "Spain", dial: "34" },
  { code: "LK", name: "Sri Lanka", dial: "94" },
  { code: "SE", name: "Sweden", dial: "46" },
  { code: "CH", name: "Switzerland", dial: "41" },
  { code: "SY", name: "Syria", dial: "963" },
  { code: "TJ", name: "Tajikistan", dial: "992" },
  { code: "TH", name: "Thailand", dial: "66" },
  { code: "TN", name: "Tunisia", dial: "216" },
  { code: "TR", name: "Turkey", dial: "90" },
  { code: "TM", name: "Turkmenistan", dial: "993" },
  { code: "UA", name: "Ukraine", dial: "380" },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
  { code: "GB", name: "United Kingdom", dial: "44" },
  { code: "US", name: "United States", dial: "1" },
  { code: "UZ", name: "Uzbekistan", dial: "998" },
  { code: "VN", name: "Vietnam", dial: "84" },
];

export const NATIONALITY_SUGGESTIONS = COUNTRIES.map(({ name }) => name);

export const COUNTRY_BY_CODE = new Map(
  COUNTRIES.map((country) => [country.code, country]),
);

export const COUNTRY_BY_NAME = new Map(
  COUNTRIES.map((country) => [country.name.toLowerCase(), country]),
);

const dialGroups = COUNTRIES.reduce((groups, country) => {
  if (!groups.has(country.dial)) groups.set(country.dial, []);
  groups.get(country.dial).push(country.code);
  return groups;
}, new Map());

export const PHONE_CODES = Array.from(dialGroups, ([code, countryCodes]) => ({
  code,
  label: `+${code} ${countryCodes.join(" / ")}`,
})).sort((first, second) => Number(first.code) - Number(second.code));

export const DEFAULT_PHONE_COUNTRY_CODE = "971";

export const normalizePhoneDigits = (value) =>
  String(value ?? "").replace(/\D/g, "");

export const buildMobileNumber = (countryCode, phoneNumber) => {
  const code = normalizePhoneDigits(countryCode);
  let number = normalizePhoneDigits(phoneNumber);

  if (number.startsWith("00")) number = number.slice(2);
  if (number.startsWith("0")) number = number.slice(1);
  if (code && number.startsWith(code) && number.length > code.length + 5) {
    return number;
  }

  return `${code}${number}`;
};

export const getCountryName = (code) =>
  COUNTRY_BY_CODE.get(String(code ?? "").toUpperCase())?.name || "";

export const getCountryCode = (name) =>
  COUNTRY_BY_NAME.get(String(name ?? "").trim().toLowerCase())?.code || "";

export const isCountryCode = (code) =>
  COUNTRY_BY_CODE.has(String(code ?? "").toUpperCase());
