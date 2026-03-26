import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { useOnboarding } from "./OnboardingProvider";

interface CoachmarkProps {
  id: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  delay?: number;
}

export function Coachmark({
  id,
  title,
  description,
  position = "bottom",
  children,
  delay = 800,
}: CoachmarkProps) {
  const { isActive, hasSeenStep, markStepSeen, registerStep, isCurrentStep } = useOnboarding();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerStep(id);
  }, [id, registerStep]);

  const alreadySeen = hasSeenStep(id);
  const isCurrent = isCurrentStep(id);
  const shouldShow = isActive && !alreadySeen && isCurrent;

  useEffect(() => {
    if (!shouldShow) { setVisible(false); return; }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [shouldShow, delay]);

  const dismiss = () => {
    setVisible(false);
    markStepSeen(id);
  };

  if (!shouldShow && !visible) {
    return <>{children}</>;
  }

  // Position the tooltip below the element with a small gap
  const positionStyles: Record<string, string> = {
    top: "bottom-full left-0 mb-3",
    bottom: "top-full left-0 mt-3",
    left: "right-full top-0 mr-3",
    right: "left-full top-0 ml-3",
  };

  return (
    <div className="relative">
      {/* Subtle highlight border — no aggressive pulsing */}
      {shouldShow && (
        <div className="absolute inset-0 rounded-xl pointer-events-none z-10">
          <div className="absolute inset-0 rounded-xl border-2 border-[#1C7BB1]/60 shadow-[0_0_12px_rgba(28,123,177,0.2)]" />
          {/* Small dot indicator */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#F59E1C] rounded-full border-2 border-white shadow-sm">
            <span className="absolute inset-0 rounded-full bg-[#F59E1C] animate-ping opacity-50" />
          </span>
        </div>
      )}

      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: position === "top" ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === "top" ? 8 : -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`absolute z-50 ${positionStyles[position]}`}
            style={{ maxWidth: "280px", minWidth: "220px" }}
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Accent bar */}
              <div className="h-1 bg-gradient-to-r from-[#1C7BB1] to-[#F59E1C]" />

              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-[#0A4A6E] leading-snug">{title}</p>
                  <button onClick={dismiss} className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mt-1">{description}</p>
                <button
                  onClick={dismiss}
                  className="mt-3 flex items-center gap-1 text-xs font-medium text-[#1C7BB1] hover:text-[#0A4A6E] transition-colors"
                >
                  Entendido
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
