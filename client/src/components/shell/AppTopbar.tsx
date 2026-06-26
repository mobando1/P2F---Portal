import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import LanguageSwitcher from "@/components/language-switcher";
import NotificationBell from "@/components/NotificationBell";
import { useLanguage } from "@/lib/i18n";
import { navForArea, navLabel, CRM_BASE, ADMIN_BASE, type Area } from "./navItems";

interface AppTopbarProps {
  area: Area;
  onOpenCommand: () => void;
}

export function AppTopbar({ area, onOpenCommand }: AppTopbarProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [location] = useLocation();

  const base = area === "crm" ? CRM_BASE : ADMIN_BASE;
  const nav = navForArea(area);
  const current =
    [...nav]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => (item.href === base ? location === base : location.startsWith(item.href))) ??
    nav[0];
  const areaLabel = area === "crm" ? "CRM" : isEs ? "Administración" : "Admin";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />

      {/* Breadcrumb */}
      <nav className="hidden items-center gap-1.5 text-sm sm:flex">
        <span className="text-muted-foreground">{areaLabel}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="font-medium text-foreground">{navLabel(current, isEs)}</span>
      </nav>

      {/* Command palette trigger */}
      <button
        type="button"
        onClick={onOpenCommand}
        className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:w-64"
      >
        <Search className="h-4 w-4" />
        <span className="hidden flex-1 text-left sm:inline">{isEs ? "Buscar…" : "Search…"}</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-0.5">
        <NotificationBell />
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
