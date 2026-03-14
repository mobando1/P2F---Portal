import { motion } from "framer-motion";

// Colors match P2F Wanderlust Tracker: A1 lightest → B2 darkest
const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A1: { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300" },
  A2: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  B1: { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
  B2: { bg: "bg-blue-900/10", text: "text-blue-900", border: "border-blue-800" },
};

interface LevelBadgeProps {
  level: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export default function LevelBadge({ level, size = "md", animate = false }: LevelBadgeProps) {
  const colors = LEVEL_COLORS[level] || LEVEL_COLORS.A1;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5 font-semibold",
  };

  const badge = (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]}`}
    >
      {level}
    </span>
  );

  if (animate) {
    return (
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {badge}
      </motion.span>
    );
  }

  return badge;
}
