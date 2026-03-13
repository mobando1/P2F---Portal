import { useCurrency, CURRENCIES } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";

export default function CurrencySwitcher() {
  const { currency, setCurrency, getCurrencyInfo } = useCurrency();
  const info = getCurrencyInfo();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
          <span>{info.flag}</span>
          <span className="hidden sm:inline">{info.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
        {CURRENCIES.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCurrency(c.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{c.flag}</span>
              <span className="text-sm">{c.code}</span>
              <span className="text-xs text-gray-400">{c.symbol}</span>
            </span>
            {currency === c.code && <Check className="h-3.5 w-3.5 text-[#1C7BB1]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
