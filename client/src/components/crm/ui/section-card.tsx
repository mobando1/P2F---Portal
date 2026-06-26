import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
  loading?: boolean;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}

/** Card de sección con header (título + acción), body y footer opcionales. */
export function SectionCard({
  title,
  description,
  action,
  footer,
  noPadding = false,
  loading = false,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      {(title || action) && (
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border/60 p-4 sm:p-5">
          <div className="space-y-0.5">
            {title && (
              <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding ? "p-0" : "p-4 sm:p-5", contentClassName)}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton shimmer className="h-5 w-2/3" />
            <Skeleton shimmer className="h-5 w-1/2" />
            <Skeleton shimmer className="h-5 w-3/4" />
          </div>
        ) : (
          children
        )}
      </CardContent>
      {footer && (
        <div className="border-t border-border/60 px-4 py-3 sm:px-5">{footer}</div>
      )}
    </Card>
  );
}
