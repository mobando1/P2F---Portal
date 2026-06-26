import {
  LayoutDashboard,
  KanbanSquare,
  Contact,
  CheckSquare,
  BarChart3,
  Send,
  Tag,
  Users,
  Mail,
  CalendarDays,
  Calendar,
  BookOpen,
  LifeBuoy,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Flag,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type Area = "crm" | "admin";

export interface NavItem {
  key: string;
  href: string;
  labelEs: string;
  labelEn: string;
  icon: LucideIcon;
  group: string;
}

export const CRM_BASE = "/admin/crm";
export const ADMIN_BASE = "/admin";

export const crmNav: NavItem[] = [
  { key: "dashboard", href: CRM_BASE, labelEs: "Dashboard", labelEn: "Dashboard", icon: LayoutDashboard, group: "crm" },
  { key: "pipeline", href: `${CRM_BASE}/pipeline`, labelEs: "Pipeline", labelEn: "Pipeline", icon: KanbanSquare, group: "crm" },
  { key: "contacts", href: `${CRM_BASE}/contacts`, labelEs: "Contactos", labelEn: "Contacts", icon: Contact, group: "crm" },
  { key: "tasks", href: `${CRM_BASE}/tasks`, labelEs: "Tareas", labelEn: "Tasks", icon: CheckSquare, group: "crm" },
  { key: "metrics", href: `${CRM_BASE}/metrics`, labelEs: "Métricas", labelEn: "Metrics", icon: BarChart3, group: "crm" },
  { key: "campaigns", href: `${CRM_BASE}/campaigns`, labelEs: "Campañas", labelEn: "Campaigns", icon: Send, group: "marketing" },
  { key: "offers", href: `${CRM_BASE}/offers`, labelEs: "Ofertas", labelEn: "Offers", icon: Tag, group: "marketing" },
  { key: "segments", href: `${CRM_BASE}/segments`, labelEs: "Segmentos", labelEn: "Segments", icon: Users, group: "marketing" },
  { key: "subscribers", href: `${CRM_BASE}/subscribers`, labelEs: "Suscriptores", labelEn: "Subscribers", icon: Mail, group: "marketing" },
];

// Admin: el item "tutors" usa /admin (base) para resaltarse por defecto.
export const adminNav: NavItem[] = [
  { key: "tutors", href: ADMIN_BASE, labelEs: "Profesores", labelEn: "Tutors", icon: Users, group: "operacion" },
  { key: "classes", href: `${ADMIN_BASE}/classes`, labelEs: "Clases", labelEn: "Classes", icon: CalendarDays, group: "operacion" },
  { key: "calendar", href: `${ADMIN_BASE}/calendar`, labelEs: "Calendario", labelEn: "Calendar", icon: Calendar, group: "operacion" },
  { key: "learning-path", href: `${ADMIN_BASE}/learning-path`, labelEs: "Culebrita", labelEn: "Learning Path", icon: BookOpen, group: "operacion" },
  { key: "analytics", href: `${ADMIN_BASE}/analytics`, labelEs: "Analíticas", labelEn: "Analytics", icon: BarChart3, group: "negocio" },
  { key: "payments", href: `${ADMIN_BASE}/payments`, labelEs: "Pagos", labelEn: "Payments", icon: DollarSign, group: "negocio" },
  { key: "disputes", href: `${ADMIN_BASE}/disputes`, labelEs: "Disputas", labelEn: "Disputes", icon: AlertTriangle, group: "negocio" },
  { key: "ai-stats", href: `${ADMIN_BASE}/ai-stats`, labelEs: "IA Práctica", labelEn: "AI Practice", icon: Sparkles, group: "ia" },
  { key: "ai-cost", href: `${ADMIN_BASE}/ai-cost`, labelEs: "Costo IA", labelEn: "AI Cost", icon: DollarSign, group: "ia" },
  { key: "support", href: `${ADMIN_BASE}/support`, labelEs: "Soporte", labelEn: "Support", icon: LifeBuoy, group: "sistema" },
  { key: "feature-flags", href: `${ADMIN_BASE}/feature-flags`, labelEs: "Flags", labelEn: "Feature Flags", icon: Flag, group: "sistema" },
  { key: "settings", href: `${ADMIN_BASE}/settings`, labelEs: "Configuración", labelEn: "Settings", icon: Settings, group: "sistema" },
];

export const navGroupLabel: Record<string, { es: string; en: string }> = {
  crm: { es: "CRM", en: "CRM" },
  marketing: { es: "Marketing", en: "Marketing" },
  operacion: { es: "Operación", en: "Operations" },
  negocio: { es: "Negocio", en: "Business" },
  ia: { es: "IA", en: "AI" },
  sistema: { es: "Sistema", en: "System" },
};

export function navForArea(area: Area): NavItem[] {
  return area === "crm" ? crmNav : adminNav;
}

export function groupsForArea(area: Area): string[] {
  return area === "crm" ? ["crm", "marketing"] : ["operacion", "negocio", "ia", "sistema"];
}

export function navLabel(item: NavItem, isEs: boolean): string {
  return isEs ? item.labelEs : item.labelEn;
}
