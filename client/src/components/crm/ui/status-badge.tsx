import { cn } from "@/lib/utils";

/**
 * Mapa centralizado de colores por stage del pipeline y por estado genérico.
 * Reemplaza los hardcodes de color dispersos en CrmPipeline / CrmMetrics.
 * Todas las clases usan tokens → respetan modo claro/oscuro automáticamente.
 */
const STAGE_TOKENS: Record<string, string> = {
  trial: "bg-primary/10 text-primary ring-primary/20",
  lead: "bg-accent/10 text-accent-700 ring-accent/20 dark:text-accent",
  negotiation: "bg-warning/15 text-warning-foreground ring-warning/30 dark:text-warning",
  customer: "bg-success/10 text-success ring-success/20",
  inactive: "bg-muted text-muted-foreground ring-border",
};

const STATE_TOKENS: Record<string, string> = {
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/15 text-warning-foreground ring-warning/30 dark:text-warning",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  info: "bg-primary/10 text-primary ring-primary/20",
  neutral: "bg-muted text-muted-foreground ring-border",
  // Campaign / task statuses
  draft: "bg-muted text-muted-foreground ring-border",
  scheduled: "bg-primary/10 text-primary ring-primary/20",
  sending: "bg-accent/10 text-accent-700 ring-accent/20 dark:text-accent",
  sent: "bg-success/10 text-success ring-success/20",
  cancelled: "bg-destructive/10 text-destructive ring-destructive/20",
  pending: "bg-warning/15 text-warning-foreground ring-warning/30 dark:text-warning",
  completed: "bg-success/10 text-success ring-success/20",
  active: "bg-success/10 text-success ring-success/20",
  new: "bg-primary/10 text-primary ring-primary/20",
};

const DOT_TOKENS: Record<string, string> = {
  trial: "bg-primary",
  lead: "bg-accent",
  negotiation: "bg-warning",
  customer: "bg-success",
  inactive: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-primary",
  neutral: "bg-muted-foreground",
  draft: "bg-muted-foreground",
  scheduled: "bg-primary",
  sending: "bg-accent",
  sent: "bg-success",
  cancelled: "bg-destructive",
  pending: "bg-warning",
  completed: "bg-success",
  active: "bg-success",
  new: "bg-primary",
};

interface StatusBadgeProps {
  status: string;
  /** Texto a mostrar (si difiere de status, p.ej. i18n o capitalización) */
  label?: string;
  variant?: "stage" | "state";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  variant = "state",
  size = "md",
  dot = true,
  className,
}: StatusBadgeProps) {
  const key = status?.toLowerCase?.() ?? status;
  const tokens =
    (variant === "stage" ? STAGE_TOKENS[key] : STATE_TOKENS[key]) ??
    STATE_TOKENS[key] ??
    STATE_TOKENS.neutral;
  const dotColor = DOT_TOKENS[key] ?? DOT_TOKENS.neutral;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset",
        size === "md" ? "px-2.5 py-0.5 text-xs" : "px-2 py-0.5 text-[11px]",
        tokens,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />}
      {label ?? status}
    </span>
  );
}
