/**
 * Global region data: countries we support in Phase 1, with currency, locale,
 * estimated annual inflation rate, and a short note about the local pension system.
 *
 * Inflation values are reasonable defaults used when an AI/live estimate isn't
 * available. They are *display-time* defaults and AI can override them.
 */
export interface Country {
  code: string;          // ISO 3166-1 alpha-2
  name: string;
  flag: string;          // emoji
  currency: string;      // ISO 4217
  locale: string;        // BCP 47
  inflation: number;     // annual %, indicative
  pensionNote: string;   // short, AI-augmentable
}

export const COUNTRIES: Country[] = [
  { code: "NG", name: "Nigeria",        flag: "🇳🇬", currency: "NGN", locale: "en-NG", inflation: 28,  pensionNote: "Contributory Pension Scheme (PFA-managed)" },
  { code: "US", name: "United States",  flag: "🇺🇸", currency: "USD", locale: "en-US", inflation: 3,   pensionNote: "Social Security + 401(k)/IRA" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", locale: "en-GB", inflation: 4,   pensionNote: "State Pension + workplace/SIPP" },
  { code: "CA", name: "Canada",         flag: "🇨🇦", currency: "CAD", locale: "en-CA", inflation: 3,   pensionNote: "CPP + OAS + RRSP/TFSA" },
  { code: "DE", name: "Germany",        flag: "🇩🇪", currency: "EUR", locale: "de-DE", inflation: 3,   pensionNote: "Statutory pension + Riester/Rürup" },
  { code: "FR", name: "France",         flag: "🇫🇷", currency: "EUR", locale: "fr-FR", inflation: 3,   pensionNote: "Régime général + complémentaire" },
  { code: "ES", name: "Spain",          flag: "🇪🇸", currency: "EUR", locale: "es-ES", inflation: 3,   pensionNote: "Sistema público + planes privados" },
  { code: "KE", name: "Kenya",          flag: "🇰🇪", currency: "KES", locale: "en-KE", inflation: 7,   pensionNote: "NSSF + private/occupational schemes" },
  { code: "GH", name: "Ghana",          flag: "🇬🇭", currency: "GHS", locale: "en-GH", inflation: 22,  pensionNote: "SSNIT (Tier 1-3)" },
  { code: "ZA", name: "South Africa",   flag: "🇿🇦", currency: "ZAR", locale: "en-ZA", inflation: 5,   pensionNote: "GEPF / private retirement annuities" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function getCountry(code?: string | null): Country {
  if (!code) return DEFAULT_COUNTRY;
  return COUNTRIES.find((c) => c.code === code) || DEFAULT_COUNTRY;
}

/** Format a money amount using the user's currency + locale. Falls back gracefully. */
export function formatMoney(
  amount: number | null | undefined,
  currency = "NGN",
  locale = "en-NG",
  opts: Intl.NumberFormatOptions = {}
): string {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      ...opts,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString("en-US")}`;
  }
}

/**
 * Browser-detected default. Matches a country whose locale starts with the
 * browser's language tag; otherwise returns Nigeria.
 */
export function detectCountry(): Country {
  if (typeof navigator === "undefined") return DEFAULT_COUNTRY;
  const lang = navigator.language || "en-NG";
  const region = lang.split("-")[1]?.toUpperCase();
  if (region) {
    const match = COUNTRIES.find((c) => c.code === region);
    if (match) return match;
  }
  return DEFAULT_COUNTRY;
}
