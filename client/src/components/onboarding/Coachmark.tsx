import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useOnboarding } from "./OnboardingProvider";

interface CoachmarkProps {
  id: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  delay?: number; // ms before auto-showing
}

export function Coachmark({
  id,
  title,
  description,
  position = "bottom",
  children,
  delay = 600,
}: CoachmarkProps) {
  const { isActive, hasSeenStep, markStepSeen, registerStep, isCurrentStep } = useOnboarding();
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Register this step on mount so the provider knows the order
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

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses: Record<string, string> = {
    top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-[6px] border-t-[#1C7BB1]",
    bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-0 border-b-[6px] border-b-[#1C7BB1]",
    left: "right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-0 border-l-[6px] border-l-[#1C7BB1]",
    right: "left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-0 border-r-[6px] border-r-[#1C7BB1]",
  };

  if (!shouldShow && !visible) {
    return <>{children}</>;
  }

  return (
    <div ref={ref} className="relative inline-block">
      {/* Pulsing ring when active */}
      {shouldShow && !alreadySeen && (
        <span className="absolute inset-0 rounded-lg pointer-events-none z-10">
          <span className="absolute inset-0 rounded-lg ring-2 ring-[#1C7BB1] animate-ping opacity-40" />
          <span className="absolute inset-0 rounded-lg ring-2 ring-[#1C7BB1] opacity-60" />
        </span>
      )}

      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className={`absolute z-50 w-64 ${positionClasses[position]}`}
          >
            {/* Arrow */}
            <div className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`} />

            {/* Card */}
            <div className="bg-[#1C7BB1] text-white rounded-xl shadow-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm leading-snug">{title}</p>
                <button
                  onClick={dismiss}
                  className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity mt-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">{description}</p>
              <button
                onClick={dismiss}
                className="mt-2.5 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
              >
                Entendido ✓
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
