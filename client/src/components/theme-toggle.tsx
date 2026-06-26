import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { spring } from "@/lib/animations";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Evita mismatch de hidratación (next-themes lo recomienda)
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const label =
    language === "es"
      ? isDark
        ? "Cambiar a modo claro"
        : "Cambiar a modo oscuro"
      : isDark
        ? "Switch to light mode"
        : "Switch to dark mode";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={spring.snappy}
            className="flex items-center justify-center"
          >
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </motion.span>
        </AnimatePresence>
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
