import { Fragment } from "react";
import { motion } from "framer-motion";
import { Lock, Check, Play, Star, Shield, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface StationProgress {
  status: string;
  score: number | null;
  completedAt: string | null;
}

interface Station {
  id: number;
  level: string;
  stationOrder: number;
  title: string;
  titleEs: string;
  description: string | null;
  descriptionEs: string | null;
  stationType: string;
  progress: StationProgress | null;
}

interface LevelGroup {
  level: string;
  stations: Station[];
}

interface SnakePathProps {
  levels: LevelGroup[];
  currentLevel: string;
  userAvatar?: string | null;
  onStationClick: (stationId: number) => void;
}

const LEVEL_THEME: Record<string, {
  primary: string;
  bg: string;
  bgSection: string;
  line: string;
  gradient: string;
  label: string;
  labelEs: string;
}> = {
  A1: {
    primary: "#10b981", bg: "#d1fae5", bgSection: "rgba(16,185,129,0.07)",
    line: "#6ee7b7", gradient: "linear-gradient(135deg,#10b981,#059669)",
    label: "Beginner", labelEs: "Principiante",
  },
  A2: {
    primary: "#14b8a6", bg: "#ccfbf1", bgSection: "rgba(20,184,166,0.07)",
    line: "#5eead4", gradient: "linear-gradient(135deg,#14b8a6,#0d9488)",
    label: "Elementary", labelEs: "Elemental",
  },
  B1: {
    primary: "#1C7BB1", bg: "#EAF4FA", bgSection: "rgba(28,123,177,0.07)",
    line: "#7cc3e6", gradient: "linear-gradient(135deg,#1C7BB1,#0A4A6E)",
    label: "Intermediate", labelEs: "Intermedio",
  },
  B2: {
    primary: "#6366f1", bg: "#e0e7ff", bgSection: "rgba(99,102,241,0.07)",
    line: "#a5b4fc", gradient: "linear-gradient(135deg,#6366f1,#4f46e5)",
    label: "Upper Intermediate", labelEs: "Intermedio Alto",
  },
};

const COLS = 4;

function getPos(index: number) {
  const row = Math.floor(index / COLS);
  const colInRow = index % COLS;
  const isReversed = row % 2 === 1;
  const col = isReversed ? COLS - 1 - colInRow : colInRow;
  return {
    x: 14 + col * 24,   // 14%, 38%, 62%, 86%
    y: row * 160 + 90,   // more vertical space
  };
}

/** Build an SVG path string between two node positions */
function buildCurvePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  containerWidth: number,
): string {
  const fx = (from.x / 100) * containerWidth;
  const fy = from.y;
  const tx = (to.x / 100) * containerWidth;
  const ty = to.y;

  if (Math.abs(fy - ty) < 2) {
    // Same row — gentle arc upward
    const midX = (fx + tx) / 2;
    const midY = fy - 28;
    return `M ${fx} ${fy} Q ${midX} ${midY} ${tx} ${ty}`;
  }

  // Different row — smooth S-curve
  const cp1x = fx;
  const cp1y = fy + (ty - fy) * 0.45;
  const cp2x = tx;
  const cp2y = ty - (ty - fy) * 0.45;
  return `M ${fx} ${fy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
}

function StationNode({
  station,
  index,
  isCurrentStation,
  theme,
  onClick,
  language,
}: {
  station: Station;
  index: number;
  isCurrentStation: boolean;
  theme: typeof LEVEL_THEME.A1;
  onClick: () => void;
  language: string;
}) {
  const status = station.progress?.status || "locked";
  const title = language === "es" ? station.titleEs : station.title;
  const isMilestone = station.stationType === "milestone";
  const canClick = status !== "locked";

  const pos = getPos(index);

  const nodeSize = isMilestone ? 80 : 72;

  const styles = (() => {
    switch (status) {
      case "completed":
        return {
          bg: theme.primary,
          border: theme.primary,
          iconColor: "white",
          shadow: `0 6px 20px ${theme.primary}44, 0 2px 8px ${theme.primary}33`,
        };
      case "available":
        return {
          bg: "white",
          border: theme.primary,
          iconColor: theme.primary,
          shadow: `0 4px 16px ${theme.primary}28, 0 1px 4px rgba(0,0,0,0.06)`,
        };
      case "in_progress":
        return {
          bg: theme.bg,
          border: theme.primary,
          iconColor: theme.primary,
          shadow: `0 4px 16px ${theme.primary}28, 0 1px 4px rgba(0,0,0,0.06)`,
        };
      default:
        return {
          bg: "#f9fafb",
          border: "#e5e7eb",
          iconColor: "#bcbfc4",
          shadow: "0 1px 3px rgba(0,0,0,0.04)",
        };
    }
  })();

  const icon = (() => {
    if (status === "completed") return <Check size={24} color="white" strokeWidth={2.5} />;
    if (status === "locked") return <Lock size={18} color={styles.iconColor} />;
    if (isMilestone) return <Star size={22} color={styles.iconColor} fill={status !== "locked" ? styles.iconColor : "none"} />;
    return <Play size={19} color={styles.iconColor} fill={styles.iconColor} />;
  })();

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}px`,
        transform: "translate(-50%, -50%)",
        opacity: status === "locked" ? 0.5 : 1,
        cursor: canClick ? "pointer" : "default",
        zIndex: 2,
      }}
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: status === "locked" ? 0.5 : 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 280, damping: 22 }}
      onClick={() => canClick && onClick()}
      whileHover={canClick ? { scale: 1.1, y: -2 } : {}}
      whileTap={canClick ? { scale: 0.93 } : {}}
    >
      {/* Node circle */}
      <div
        className="relative flex items-center justify-center rounded-full transition-shadow duration-300"
        style={{
          width: nodeSize,
          height: nodeSize,
          backgroundColor: styles.bg,
          border: `3px solid ${styles.border}`,
          boxShadow: styles.shadow,
        }}
      >
        {icon}

        {/* Score badge for completed */}
        {status === "completed" && station.progress?.score != null && (
          <div
            className="absolute -bottom-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: theme.primary, border: "2px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
          >
            {station.progress.score}%
          </div>
        )}

        {/* Pulse ring for available */}
        {status === "available" && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: `2px solid ${theme.primary}` }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        )}

        {/* Current position indicator */}
        {isCurrentStation && (
          <motion.div
            className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#F59E1C] border-2 border-white shadow-lg flex items-center justify-center"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-white text-[9px] font-bold">★</span>
          </motion.div>
        )}
      </div>

      {/* Label */}
      <span
        className="mt-2.5 text-xs font-medium text-center leading-tight line-clamp-2 px-1"
        style={{
          color: status === "locked" ? "#9ca3af" : "#374151",
          maxWidth: "110px",
        }}
      >
        {title}
      </span>
    </motion.div>
  );
}

export default function SnakePath({ levels, currentLevel, onStationClick }: SnakePathProps) {
  const { language } = useLanguage();
  const es = language === "es";

  let currentStationId: number | null = null;
  for (const level of levels) {
    if (level.level === currentLevel) {
      const active = level.stations.find(
        s => s.progress?.status === "available" || s.progress?.status === "in_progress"
      );
      if (active) { currentStationId = active.id; break; }
    }
  }

  // Reference width for SVG curve calculations
  const REF_WIDTH = 600;

  return (
    <div className="w-full flex flex-col gap-5">
      {levels.map((levelGroup, idx) => {
        const theme = LEVEL_THEME[levelGroup.level] || LEVEL_THEME.A1;
        const nextGroup = levels[idx + 1];
        const nextTheme = nextGroup ? (LEVEL_THEME[nextGroup.level] || LEVEL_THEME.A1) : null;
        const rows = Math.ceil(levelGroup.stations.length / COLS);
        const height = rows * 160 + 100;
        const completed = levelGroup.stations.filter(s => s.progress?.status === "completed").length;
        const total = levelGroup.stations.length;
        const isActive = levelGroup.level === currentLevel;

        return (
          <Fragment key={levelGroup.level}>
          <div
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{
              borderLeft: `4px solid ${theme.primary}`,
              border: `1px solid ${theme.primary}20`,
              borderLeftWidth: "4px",
              borderLeftColor: theme.primary,
              background: `linear-gradient(135deg, ${theme.bgSection} 0%, white 60%)`,
            }}
          >
            {/* Level header */}
            <div
              className="px-5 py-4 flex items-center gap-4"
              style={{ background: theme.gradient }}
            >
              <div className="p-2.5 rounded-xl bg-white/20 flex-shrink-0 backdrop-blur-sm">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-bold text-lg">{levelGroup.level}</span>
                  <span className="text-white/80 text-sm font-medium">
                    — {es ? theme.labelEs : theme.label}
                  </span>
                  {isActive && (
                    <span className="ml-1 text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {es ? "Actual" : "Current"}
                    </span>
                  )}
                </div>
                {/* Mini progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%" }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>
                  <span className="text-white/80 text-[11px] font-medium flex-shrink-0">
                    {completed}/{total}
                  </span>
                </div>
              </div>
            </div>

            {/* Snake grid */}
            <div
              className="relative mx-auto px-2"
              style={{
                height: `${height}px`,
                minWidth: "320px",
                maxWidth: "700px",
              }}
            >
              {/* Connection curves */}
              <svg
                className="absolute inset-0 w-full pointer-events-none"
                style={{ zIndex: 0, height: `${height}px` }}
                viewBox={`0 0 ${REF_WIDTH} ${height}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Glow filter for completed paths */}
                  <filter id={`glow-${levelGroup.level}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  {/* Gradient for completed paths */}
                  <linearGradient id={`grad-${levelGroup.level}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={theme.primary} stopOpacity="0.8" />
                    <stop offset="50%" stopColor={theme.line} stopOpacity="1" />
                    <stop offset="100%" stopColor={theme.primary} stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Track base — all connections (dashed gray) */}
                {levelGroup.stations.map((_, sIdx) => {
                  if (sIdx === 0) return null;
                  const from = getPos(sIdx - 1);
                  const to = getPos(sIdx);
                  const d = buildCurvePath(from, to, REF_WIDTH);
                  return (
                    <path
                      key={`track-${sIdx}`}
                      d={d}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeDasharray="8 6"
                    />
                  );
                })}

                {/* Progress — completed connections on top */}
                {levelGroup.stations.map((_, sIdx) => {
                  if (sIdx === 0) return null;
                  const from = getPos(sIdx - 1);
                  const to = getPos(sIdx);
                  const isComplete = (levelGroup.stations[sIdx - 1].progress?.status || "locked") === "completed";
                  if (!isComplete) return null;
                  const d = buildCurvePath(from, to, REF_WIDTH);
                  return (
                    <path
                      key={`prog-${sIdx}`}
                      d={d}
                      fill="none"
                      stroke={`url(#grad-${levelGroup.level})`}
                      strokeWidth={6}
                      strokeLinecap="round"
                      filter={`url(#glow-${levelGroup.level})`}
                    />
                  );
                })}
              </svg>

              {/* Stations */}
              {levelGroup.stations.map((station, sIdx) => (
                <StationNode
                  key={station.id}
                  station={station}
                  index={sIdx}
                  isCurrentStation={station.id === currentStationId}
                  theme={theme}
                  onClick={() => onStationClick(station.id)}
                  language={language}
                />
              ))}
            </div>
          </div>

          {/* Level connector */}
          {nextTheme && (
            <div className="flex flex-col items-center py-1">
              <div
                className="w-0.5 h-6 rounded-full"
                style={{ background: `linear-gradient(to bottom, ${theme.primary}, ${nextTheme.primary})` }}
              />
              <div
                className="w-9 h-9 rounded-full border-2 bg-white flex items-center justify-center shadow-md"
                style={{ borderColor: nextTheme.primary }}
              >
                <ChevronDown size={16} style={{ color: nextTheme.primary }} />
              </div>
              <div
                className="w-0.5 h-6 rounded-full"
                style={{ background: `linear-gradient(to bottom, ${theme.primary}, ${nextTheme.primary})` }}
              />
            </div>
          )}
          </Fragment>
        );
      })}
    </div>
  );
}
