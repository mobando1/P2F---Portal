import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeInUp } from "@/lib/animations";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

/** Estado vacío ilustrado con icono en círculo de marca + CTA. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "md" ? "px-6 py-14" : "px-4 py-8",
        className,
      )}
    >
      <span
        className={cn(
          "mb-4 flex items-center justify-center rounded-2xl bg-primary/10 text-primary",
          size === "md" ? "h-16 w-16" : "h-12 w-12",
        )}
      >
        <Icon className={size === "md" ? "h-7 w-7" : "h-5 w-5"} />
      </span>
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
