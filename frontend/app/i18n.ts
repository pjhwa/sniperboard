export type Locale = 'en' | 'ko'

export interface BiLang {
  en: string
  ko: string
}

export const t = (obj: BiLang | undefined | null, locale: Locale): string => obj ? obj[locale] : ''

// Helper for AI data fields that may be v2.0 (has _en/_ko) or v1.x (single field)
export const tField = (
  enVal: string | null | undefined,
  koVal: string | null | undefined,
  fallback: string | null | undefined,
  locale: Locale,
): string => {
  if (locale === 'en') return enVal ?? fallback ?? ''
  return koVal ?? fallback ?? ''
}
