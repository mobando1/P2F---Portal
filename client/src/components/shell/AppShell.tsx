import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { CommandPalette } from "./CommandPalette";
import type { Area } from "./navItems";

/**
 * Shell unificado (CRM + Admin): sidebar colapsable + topbar + command palette ⌘K.
 * El sidebar de shadcn ya colapsa a drawer en mobile y persiste estado en cookie.
 */
export function AppShell({ area = "crm", children }: { area?: Area; children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);

  // Atajo global ⌘K / Ctrl+K (el sidebar ya usa ⌘B internamente)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar area={area} />
      <SidebarInset>
        <AppTopbar area={area} onOpenCommand={() => setCommandOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </SidebarProvider>
  );
}
