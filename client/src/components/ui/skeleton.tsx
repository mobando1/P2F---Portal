import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Usa un barrido (shimmer) en vez del pulse por defecto */
  shimmer?: boolean
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  if (shimmer) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-md bg-muted",
          "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
          "after:bg-gradient-to-r after:from-transparent after:via-white/25 after:to-transparent",
          "dark:after:via-white/5",
          className,
        )}
        {...props}
      />
    )
  }
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
