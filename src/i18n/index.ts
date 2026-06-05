import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import sw from "./locales/sw.json";
import ha from "./locales/ha.json";
import yo from "./locales/yo.json";
import ig from "./locales/ig.json";
import zu from "./locales/zu.json";
import af from "./locales/af.json";
import pt from "./locales/pt.json";
import ar from "./locales/ar.json";
import he from "./locales/he.json";

export const SUPPORTED_LANGS = ["en","fr","de","es","sw","ha","yo","ig","zu","af","pt","ar","he"] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

const RTL = new Set(["ar","he","fa","ur"]);
export function isRTL(lng?: string | null) {
  return RTL.has((lng || "").toLowerCase().split("-")[0]);
}

function applyDirection(lng: string) {
  if (typeof document === "undefined") return;
  document.documentElement.dir = isRTL(lng) ? "rtl" : "ltr";
  document.documentElement.lang = lng;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en }, fr: { translation: fr }, de: { translation: de }, es: { translation: es },
      sw: { translation: sw }, ha: { translation: ha }, yo: { translation: yo }, ig: { translation: ig },
      zu: { translation: zu }, af: { translation: af }, pt: { translation: pt },
      ar: { translation: ar }, he: { translation: he },
    },
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LANGS],
    interpolation: { escapeValue: false },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lang",
      lookupLocalStorage: "reignite-lang",
      caches: ["localStorage"],
    },
  })
  .then(() => applyDirection(i18n.language));

i18n.on("languageChanged", applyDirection);

/** Map a BCP-47 locale (e.g. `de-DE`, `sw-KE`) onto our supported i18n codes. */
export function localeToLang(locale?: string | null): string {
  if (!locale) return "en";
  const base = locale.toLowerCase().split("-")[0];
  return (SUPPORTED_LANGS as readonly string[]).includes(base) ? base : "en";
}

export default i18n;
