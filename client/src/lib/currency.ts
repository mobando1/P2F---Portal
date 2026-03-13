import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import React from "react";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "MXN", symbol: "$", name: "Mexican Peso", flag: "🇲🇽" },
  { code: "COP", symbol: "$", name: "Colombian Peso", flag: "🇨🇴" },
  { code: "ARS", symbol: "$", name: "Argentine Peso", flag: "🇦🇷" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", flag: "🇧🇷" },
  { code: "CLP", symbol: "$", name: "Chilean Peso", flag: "🇨🇱" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol", flag: "🇵🇪" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", symbol: "$", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", flag: "🇰🇷" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", flag: "🇨🇭" },
];

// Approximate exchange rates from USD (static fallback)
const RATES_FROM_USD: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, MXN: 17.15, COP: 3950, ARS: 875,
  BRL: 4.97, CLP: 935, PEN: 3.72, CAD: 1.36, AUD: 1.53,
  JPY: 150.5, CNY: 7.24, KRW: 1330, INR: 83.1, CHF: 0.88,
};

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => void;
  formatPrice: (amountUSD: number) => string;
  getCurrencyInfo: () => CurrencyInfo;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
  formatPrice: (a) => `$${a.toFixed(2)}`,
  getCurrencyInfo: () => CURRENCIES[0],
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("p2f_currency") || "USD";
    }
    return "USD";
  });

  const setCurrency = (code: string) => {
    setCurrencyState(code);
    localStorage.setItem("p2f_currency", code);
  };

  const formatPrice = (amountUSD: number): string => {
    const rate = RATES_FROM_USD[currency] || 1;
    const converted = amountUSD * rate;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: currency === "JPY" || currency === "KRW" || currency === "CLP" || currency === "COP" || currency === "ARS" ? 0 : 2,
        maximumFractionDigits: currency === "JPY" || currency === "KRW" || currency === "CLP" || currency === "COP" || currency === "ARS" ? 0 : 2,
      }).format(converted);
    } catch {
      const info = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
      return `${info.symbol}${converted.toFixed(2)}`;
    }
  };

  const getCurrencyInfo = (): CurrencyInfo => {
    return CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  };

  return React.createElement(CurrencyContext.Provider, {
    value: { currency, setCurrency, formatPrice, getCurrencyInfo },
    children,
  });
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
