import { Link, useLocation } from "wouter";
import { LogOut, Shield, GraduationCap, LayoutGrid } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/i18n";
import { getCurrentUser, logout } from "@/lib/auth";
import {
  navForArea,
  groupsForArea,
  navGroupLabel,
  navLabel,
  CRM_BASE,
  ADMIN_BASE,
  type Area,
} from "./navItems";

export function AppSidebar({ area }: { area: Area }) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [location, setLocation] = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const user = getCurrentUser();

  const base = area === "crm" ? CRM_BASE : ADMIN_BASE;
  const nav = navForArea(area);
  const groups = groupsForArea(area);
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "P2";

  const isActive = (href: string) => (href === base ? location === base : location.startsWith(href));
  const handleNav = () => { if (isMobile) setOpenMobile(false); };
  const handleLogout = async () => { await logout(); setLocation("/login"); };

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <Link href={base} onClick={handleNav} className="flex items-center gap-2.5 px-2 py-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-700 text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display text-sm font-bold text-sidebar-foreground">Passport2Fluency</span>
            <span className="text-xs text-muted-foreground">{area === "crm" ? "CRM" : isEs ? "Administración" : "Admin"}</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{isEs ? navGroupLabel[group]?.es : navGroupLabel[group]?.en}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={navLabel(item, isEs)}>
                        <Link href={item.href} onClick={handleNav}>
                          <item.icon />
                          <span>{navLabel(item, isEs)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {area === "crm" ? (
                  <SidebarMenuButton asChild tooltip={isEs ? "Panel Admin" : "Admin Panel"}>
                    <Link href={ADMIN_BASE} onClick={handleNav}>
                      <Shield />
                      <span>{isEs ? "Panel Admin" : "Admin Panel"}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild tooltip="CRM">
                    <Link href={CRM_BASE} onClick={handleNav}>
                      <LayoutGrid />
                      <span>CRM</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium text-sidebar-foreground">{user?.firstName} {user?.lastName}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip={isEs ? "Cerrar sesión" : "Log out"}>
              <LogOut />
              <span>{isEs ? "Cerrar sesión" : "Log out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
