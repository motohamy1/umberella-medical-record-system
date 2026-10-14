import { en, type CopyDeck } from './en';
import { ar } from './ar';

export type Locale = 'en' | 'ar';

export const dictionaries: Record<Locale, CopyDeck> = {
  en,
  ar,
};

export function getDictionary(locale: Locale = 'en'): CopyDeck {
  return dictionaries[locale] || dictionaries.en;
}

export function isRtl(locale: Locale): boolean {
  return locale === 'ar';
}

export { en, ar };
export type { CopyDeck };
