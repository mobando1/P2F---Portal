import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/crm/ui/status-badge";
import { useLanguage } from "@/lib/i18n";
import {
  Download,
  Languages,
  Moon,
  Plus,
  Shield,
  Sun,
  UserPlus,
} from "lucide-react";
import { crmNav, navLabel, CRM_BASE } from "./navItems";

interface ContactHit {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
}

const COMMAND_CLASS =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { language, setLanguage } = useLanguage();
  const isEs = language === "es";
  const [, setLocation] = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");

  // Reset query each time the palette opens
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const debounced = useDebounced(query, 250);
  const searchEnabled = debounced.trim().length >= 2;

  const { data: contactData } = useQuery<{ students: ContactHit[] }>({
    queryKey: [`/api/admin/crm?search=${encodeURIComponent(debounced.trim())}&limit=8`],
    enabled: open && searchEnabled,
  });
  const contacts = contactData?.students ?? [];

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  const match = (label: string) => !query || label.toLowerCase().includes(query.toLowerCase());

  const navMatches = useMemo(
    () => crmNav.filter((item) => match(navLabel(item, isEs))),
    [query, isEs],
  );

  const actions = [
    {
      key: "new-lead",
      label: isEs ? "Crear contacto / lead" : "Create contact / lead",
      icon: UserPlus,
      onSelect: () => setLocation(`${CRM_BASE}/contacts?new=1`),
    },
    {
      key: "new-campaign",
      label: isEs ? "Nueva campaña" : "New campaign",
      icon: Plus,
      onSelect: () => setLocation(`${CRM_BASE}/campaigns?new=1`),
    },
    {
      key: "new-segment",
      label: isEs ? "Nuevo segmento" : "New segment",
      icon: Plus,
      onSelect: () => setLocation(`${CRM_BASE}/segments?new=1`),
    },
    {
      key: "export",
      label: isEs ? "Exportar contactos (CSV)" : "Export contacts (CSV)",
      icon: Download,
      onSelect: () => window.open("/api/admin/crm/export", "_blank"),
    },
    {
      key: "admin",
      label: isEs ? "Ir al Panel Admin" : "Go to Admin Panel",
      icon: Shield,
      onSelect: () => setLocation("/admin"),
    },
  ].filter((a) => match(a.label));

  const prefs = [
    {
      key: "theme",
      label:
        resolvedTheme === "dark"
          ? isEs ? "Cambiar a modo claro" : "Switch to light mode"
          : isEs ? "Cambiar a modo oscuro" : "Switch to dark mode",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      onSelect: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    },
    {
      key: "lang",
      label: isEs ? "Cambiar idioma a inglés" : "Switch language to Spanish",
      icon: Languages,
      onSelect: () => setLanguage(isEs ? "en" : "es"),
    },
  ].filter((p) => match(p.label));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-xl">
        <Command shouldFilter={false} className={COMMAND_CLASS}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={isEs ? "Buscar o ejecutar un comando…" : "Search or run a command…"}
          />
          <CommandList>
            <CommandEmpty>{isEs ? "Sin resultados." : "No results."}</CommandEmpty>

            {navMatches.length > 0 && (
              <CommandGroup heading={isEs ? "Navegación" : "Navigation"}>
                {navMatches.map((item) => (
                  <CommandItem
                    key={item.key}
                    value={`nav-${item.key}`}
                    onSelect={() => run(() => setLocation(item.href))}
                  >
                    <item.icon />
                    <span>{navLabel(item, isEs)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {searchEnabled && contacts.length > 0 && (
              <CommandGroup heading={isEs ? "Contactos" : "Contacts"}>
                {contacts.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`contact-${c.id}`}
                    onSelect={() => run(() => setLocation(`${CRM_BASE}/contacts/${c.id}`))}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                        {(c.firstName?.[0] ?? "") + (c.lastName?.[0] ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">
                      {c.firstName} {c.lastName}
                      <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>
                    </span>
                    <StatusBadge status={c.userType} variant="stage" size="sm" dot={false} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {actions.length > 0 && (
              <CommandGroup heading={isEs ? "Acciones" : "Actions"}>
                {actions.map((a) => (
                  <CommandItem key={a.key} value={`action-${a.key}`} onSelect={() => run(a.onSelect)}>
                    <a.icon />
                    <span>{a.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {prefs.length > 0 && (
              <CommandGroup heading={isEs ? "Preferencias" : "Preferences"}>
                {prefs.map((p) => (
                  <CommandItem key={p.key} value={`pref-${p.key}`} onSelect={() => run(p.onSelect)}>
                    <p.icon />
                    <span>{p.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
