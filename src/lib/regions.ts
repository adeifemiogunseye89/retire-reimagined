/**
 * Global region data: countries we support, with currency, locale,
 * estimated inflation, and a short note about the local pension system.
 *
 * Inflation values are reasonable defaults used when an AI/live estimate isn't
 * available. They are *display-time* defaults and AI can override them.
 */
export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  locale: string;
  inflation: number;
  pensionNote: string;
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

/** Fetch JSON with a hard timeout. Returns null on any failure. */
async function fetchWithTimeout(url: string, ms = 2500): Promise<any | null> {
  try {
    const ctl = new AbortController();
    const id = setTimeout(() => ctl.abort(), ms);
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctl.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Async IP-based geo-detection. Tries ipapi.co (free tier), then geojs.io,
 * then ipwho.is, then falls back to browser locale. Caches positive results
 * in sessionStorage; caches negative results for 10 minutes to avoid hammering.
 */
export async function detectCountryByIP(): Promise<Country> {
  try {
    if (typeof sessionStorage !== "undefined") {
      const cached = sessionStorage.getItem("reignite-geo");
      if (cached) {
        const match = COUNTRIES.find((c) => c.code === cached);
        if (match) return match;
      }
      const neg = sessionStorage.getItem("reignite-geo-fail");
      if (neg && Date.now() - Number(neg) < 10 * 60 * 1000) {
        return detectCountry();
      }
    }

    // Try providers in order. Each returns ISO 3166-1 alpha-2 in a different field.
    const providers: Array<() => Promise<string | null>> = [
      async () => (await fetchWithTimeout("https://ipapi.co/json/"))?.country_code ?? null,
      async () => (await fetchWithTimeout("https://get.geojs.io/v1/ip/country.json"))?.country ?? null,
      async () => (await fetchWithTimeout("https://ipwho.is/"))?.country_code ?? null,
    ];

    for (const provider of providers) {
      const code = (await provider())?.toUpperCase();
      if (!code) continue;
      const match = COUNTRIES.find((c) => c.code === code);
      if (match) {
        try { sessionStorage.setItem("reignite-geo", match.code); } catch { /* ignore */ }
        return match;
      }
    }

    try { sessionStorage.setItem("reignite-geo-fail", String(Date.now())); } catch { /* ignore */ }
  } catch {
    /* fall through */
  }
  return detectCountry();
}

const CURRENCY_SCALE: Record<string, number> = {
  NGN: 1, KES: 0.25, GHS: 0.08, ZAR: 0.04,
  USD: 0.002, CAD: 0.0025, GBP: 0.0015, EUR: 0.002,
};

export function currencyRange(
  currency: string | undefined,
  baseMin: number,
  baseMax: number,
  baseStep: number
): { min: number; max: number; step: number } {
  const scale = CURRENCY_SCALE[currency || "NGN"] ?? 1;
  const round = (n: number) => {
    if (n >= 100000) return Math.round(n / 10000) * 10000;
    if (n >= 10000) return Math.round(n / 1000) * 1000;
    if (n >= 1000) return Math.round(n / 100) * 100;
    if (n >= 100) return Math.round(n / 10) * 10;
    if (n >= 10) return Math.round(n);
    return Math.max(1, Math.round(n * 10) / 10);
  };
  return {
    min: round(baseMin * scale),
    max: round(baseMax * scale),
    step: Math.max(1, round(baseStep * scale)),
  };
}
