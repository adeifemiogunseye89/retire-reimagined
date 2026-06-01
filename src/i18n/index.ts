import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      de: { translation: de },
      es: { translation: es },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "de", "es"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "reignite-lang",
      caches: ["localStorage"],
    },
  });

/** Map a BCP-47 locale (e.g. `de-DE`) onto our supported i18n codes. */
export function localeToLang(locale?: string | null): string {
  if (!locale) return "en";
  const base = locale.toLowerCase().split("-")[0];
  return ["en", "fr", "de", "es"].includes(base) ? base : "en";
}

export default i18n;
