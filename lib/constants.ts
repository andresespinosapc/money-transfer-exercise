/** Exchange rate cache TTL in minutes */
export const CACHE_TTL_MINUTES = 60;

/** Quote expiration TTL in minutes */
export const QUOTE_TTL_MINUTES = 15;

/** Transfer fee as a decimal (1.5%) */
export const FEE_PERCENTAGE = 0.015;

/** Supported currencies for the app */
export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "MXN",
  "BRL",
  "INR",
  "CNY",
  "KRW",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];
