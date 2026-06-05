import i18n from "@/i18n";

/**
 * Get a translation string suitable for use inside PDF generators (sync).
 * Falls back to the English string if the key is missing in the target locale.
 */
export function pdfT(key: string, vars?: Record<string, string | number>, lang?: string): string {
  const fixedT = i18n.getFixedT(lang || i18n.language || "en");
  return fixedT(key, vars as any) as string;
}

export function currentLang(): string {
  return (i18n.language || "en").split("-")[0];
}
