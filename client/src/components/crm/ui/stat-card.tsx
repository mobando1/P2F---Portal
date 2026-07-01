import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { kpiPop, useCountUp } from "@/lib/animations";

interface StatCardProps {
  label: string;
  value: number | string;
  /** Variación porcentual (positivo = sube). Usa color success/danger. */
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  format?: (n: number) => string;
  loading?: boolean;
  accent?: "primary" | "accent" | "success";
  /** Si delta negativo es bueno (p.ej. churn), invierte los colores */
  invertDelta?: boolean;
  className?: string;
}

const ACCENT_RING: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "text-primary bg-primary/10",
  accent: "text-accent-700 bg-accent/10 dark:text-accent",
  success: "text-success bg-success/10",
};

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const animated = useCountUp(value);
  const rounded = Number.isInteger(value) ? Math.round(animated) : animated;
  return <>{format ? format(rounded) : rounded.toLocaleString()}</>;
}

/** KPI card premium: número con count-up, delta de tendencia y glow al hover. */
export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  format,
  loading = false,
  accent = "primary",
  invertDelta = false,
  className,
}: StatCardProps) {
  const isNumeric = typeof value === "number";
  const deltaPositive = delta !== undefined && delta >= 0;
  const deltaGood = invertDelta ? !deltaPositive : deltaPositive;

  return (
    <motion.div variants={kpiPop} initial="hidden" animate="visible">
      <Card
        className={cn(
          "group relative overflow-hidden p-5 shadow-sm transition-shadow duration-200 hover:shadow-glow-primary",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            {label}
          </p>
          {Icon && (
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", ACCENT_RING[accent])}>
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="mt-3">
          {loading ? (
            <Skeleton shimmer className="h-9 w-24" />
          ) : (
            <p className="font-display text-3xl font-bold tabular-nums text-foreground">
              {isNumeric ? <AnimatedNumber value={value as number} format={format} /> : value}
            </p>
          )}
        </div>

        {delta !== undefined && !loading && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                deltaGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {deltaPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta).toFixed(1)}%
            </span>
            {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
