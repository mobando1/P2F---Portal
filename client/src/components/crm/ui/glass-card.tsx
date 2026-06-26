import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

/** Contenedor con glassmorphism (.glass) + radio premium. */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "glass rounded-2xl shadow-lg",
        hover && "transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  ),
);
GlassCard.displayName = "GlassCard";
