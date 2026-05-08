export interface Country {
  code: string;
  name_en: string;
  name_ar: string;
  flag: string;
}

export const GCC_COUNTRIES: Country[] = [
  { code: "KW", name_en: "Kuwait", name_ar: "الكويت", flag: "🇰🇼" },
  { code: "SA", name_en: "Saudi Arabia", name_ar: "المملكة العربية السعودية", flag: "🇸🇦" },
  { code: "AE", name_en: "UAE", name_ar: "الإمارات", flag: "🇦🇪" },
  { code: "BH", name_en: "Bahrain", name_ar: "البحرين", flag: "🇧🇭" },
  { code: "OM", name_en: "Oman", name_ar: "عُمان", flag: "🇴🇲" },
  { code: "QA", name_en: "Qatar", name_ar: "قطر", flag: "🇶🇦" },
];

export const COUNTRY_MAP = new Map<string, Country>(
  GCC_COUNTRIES.map((c) => [c.code, c])
);

export function getCountry(code: string): Country | undefined {
  return COUNTRY_MAP.get(code);
}
