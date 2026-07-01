import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { fadeInUp } from "@/lib/animations";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/** Estado de error con marca + botón de reintentar. Variante cálida de EmptyState. */
export function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className ?? ""}`}
    >
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h3 className="font-display text-base font-semibold text-foreground">
        {title ?? (isEs ? "Algo salió mal" : "Something went wrong")}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description ?? (isEs
          ? "No pudimos cargar los datos. Revisa tu conexión e intenta de nuevo."
          : "We couldn't load the data. Check your connection and try again.")}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-5 gap-2" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          {isEs ? "Reintentar" : "Retry"}
        </Button>
      )}
    </motion.div>
  );
}
