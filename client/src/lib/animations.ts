import { useEffect, useState } from "react";
import { animate, useReducedMotion, type Variants } from "framer-motion";

// Fade in from bottom
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// Fade in from left
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// Fade in from right
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// Scale in
export const scaleIn: Variants = {
  hidden: { scale: 0.92, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

// Stagger container — children animate one after another
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

// Slower stagger for sections
export const slowStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

// Page transition wrapper
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// Card hover — use with whileHover on motion.div
export const cardHover = {
  y: -4,
  boxShadow: "0 12px 40px rgba(28, 123, 177, 0.12)",
  transition: { duration: 0.25 },
};

// Subtle press feedback
export const tapScale = { scale: 0.97 };

/* =============================================================================
   Spring configs — usar como `transition` en motion components
   ============================================================================= */
export const spring = {
  snappy: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 } as const, // botones, toggles
  smooth: { type: "spring", stiffness: 260, damping: 26 } as const, // cards, paneles
  gentle: { type: "spring", stiffness: 170, damping: 22 } as const, // entradas grandes / modales
  bouncy: { type: "spring", stiffness: 500, damping: 18 } as const, // KPI pop, badges
};

// Timings de referencia (ms): micro 150-200, estándar 200-250, página/modal 300-400
export const duration = {
  micro: 0.18,
  base: 0.22,
  page: 0.35,
} as const;

// Dense list stagger (40-60ms) — CRM no necesita el lento 100ms
export const listStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring.smooth },
};

export const modalScale: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.gentle },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15 } },
};

export const kpiPop: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: spring.bouncy },
};

/* =============================================================================
   useCountUp — anima un número de 0 → target (sin dependencias nuevas)
   ============================================================================= */
export function useCountUp(target: number, durationMs = 900): number {
  const prefersReduced = useReducedMotion();
  const [value, setValue] = useState(prefersReduced ? target : 0);

  useEffect(() => {
    if (prefersReduced) {
      setValue(target);
      return;
    }
    const controls = animate(0, target, {
      duration: durationMs / 1000,
      ease: "easeOut",
      onUpdate: (latest) => setValue(latest),
    });
    return () => controls.stop();
  }, [target, durationMs, prefersReduced]);

  return value;
}
