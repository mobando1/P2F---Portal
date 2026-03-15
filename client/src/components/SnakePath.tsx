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
    primary: "#10b981", bg: "#d1fae5", bgSection: "rgba(16,185,129,0.06)",
    line: "#6ee7b7", gradient: "linear-gradient(135deg,#10b981,#059669)",
    label: "Beginner", labelEs: "Principiante",
  },
  A2: {
    primary: "#14b8a6", bg: "#ccfbf1", bgSection: "rgba(20,184,166,0.06)",
    line: "#5eead4", gradient: "linear-gradient(135deg,#14b8a6,#0d9488)",
    label: "Elementary", labelEs: "Elemental",
  },
  B1: {
    primary: "#1C7BB1", bg: "#EAF4FA", bgSection: "rgba(28,123,177,0.06)",
    line: "#7cc3e6", gradient: "linear-gradient(135deg,#1C7BB1,#0A4A6E)",
    label: "Intermediate", labelEs: "Intermedio",
  },
  B2: {
    primary: "#6366f1", bg: "#e0e7ff", bgSection: "rgba(99,102,241,0.06)",
    line: "#a5b4fc", gradient: "linear-gradient(135deg,#6366f1,#4f46e5)",
    label: "Upper Intermediate", labelEs: "Intermedio Alto",
  },
  C1: {
    primary: "#F59E1C", bg: "#fef3c7", bgSection: "rgba(245,158,28,0.06)",
    line: "#fcd34d", gradient: "linear-gradient(135deg,#F59E1C,#d97706)",
    label: "Advanced", labelEs: "Avanzado",
  },
  C2: {
    primary: "#eab308", bg: "#fef9c3", bgSection: "rgba(234,179,8,0.06)",
    line: "#fde047", gradient: "linear-gradient(135deg,#eab308,#ca8a04)",
    label: "Proficiency", labelEs: "Dominio",
  },
};

function getPos(index: number, cols = 3) {
  const row = Math.floor(index / cols);
  const colInRow = index % cols;
  const isReversed = row % 2 === 1;
  const col = isReversed ? cols - 1 - colInRow : colInRow;
  return {
    x: 14 + col * 36,       // % of container width
    y: row * 130 + 72,      // px offset from top
  };
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

  const nodeSize = isMilestone ? 72 : 64;

  const styles = (() => {
    switch (status) {
      case "completed":
        return { bg: theme.primary, border: theme.primary, iconColor: "white", shadow: `0 4px 16px ${theme.primary}55` };
      case "available":
        return { bg: "white", border: theme.primary, iconColor: theme.primary, shadow: `0 4px 16px ${theme.primary}33` };
      case "in_progress":
        return { bg: theme.bg, border: theme.primary, iconColor: theme.primary, shadow: `0 4px 16px ${theme.primary}33` };
      default:
        return { bg: "#f3f4f6", border: "#d1d5db", iconColor: "#9ca3af", shadow: "none" };
    }
  })();

  const icon = (() => {
    if (status === "completed") return <Check size={22} color="white" strokeWidth={2.5} />;
    if (status === "locked") return <Lock size={16} color={styles.iconColor} />;
    if (isMilestone) return <Star size={20} color={styles.iconColor} fill={status !== "locked" ? styles.iconColor : "none"} />;
    return <Play size={17} color={styles.iconColor} fill={styles.iconColor} />;
  })();

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}px`,
        transform: "translate(-50%, -50%)",
        opacity: status === "locked" ? 0.55 : 1,
        cursor: canClick ? "pointer" : "default",
        zIndex: 1,
      }}
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: status === "locked" ? 0.55 : 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 280, damping: 22 }}
      onClick={() => canClick && onClick()}
      whileHover={canClick ? { scale: 1.08 } : {}}
      whileTap={canClick ? { scale: 0.93 } : {}}
    >
      {/* Node circle */}
      <div
        className="relative flex items-center justify-center rounded-full"
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
            className="absolute -bottom-1.5 -right-1.5 text-[9px] font-bold px-1 py-0.5 rounded-full text-white"
            style={{ backgroundColor: theme.primary, border: "2px solid white" }}
          >
            {station.progress.score}%
          </div>
        )}

        {/* Pulse ring for available */}
        {status === "available" && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: `2px solid ${theme.primary}` }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        )}

        {/* Current position indicator */}
        {isCurrentStation && (
          <motion.div
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#F59E1C] border-2 border-white shadow-md flex items-center justify-center"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-white text-[8px] font-bold">★</span>
          </motion.div>
        )}
      </div>

      {/* Label */}
      <span
        className="mt-2 text-[11px] font-medium text-center leading-tight line-clamp-2 px-1"
        style={{
          color: status === "locked" ? "#9ca3af" : "#374151",
          maxWidth: "90px",
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

  return (
    <div className="w-full flex flex-col">
      {levels.map((levelGroup, idx) => {
        const theme = LEVEL_THEME[levelGroup.level] || LEVEL_THEME.A1;
        const nextGroup = levels[idx + 1];
        const nextTheme = nextGroup ? (LEVEL_THEME[nextGroup.level] || LEVEL_THEME.A1) : null;
        const rows = Math.ceil(levelGroup.stations.length / 3);
        const height = rows * 130 + 80;
        const completed = levelGroup.stations.filter(s => s.progress?.status === "completed").length;
        const total = levelGroup.stations.length;
        const isActive = levelGroup.level === currentLevel;

        return (
          <Fragment key={levelGroup.level}>
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
            {/* Level header */}
            <div
              className="px-5 py-4 flex items-center gap-4"
              style={{ background: theme.gradient }}
            >
              <div className="p-2.5 rounded-xl bg-white/20 flex-shrink-0">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-bold text-lg">{levelGroup.level}</span>
                  <span className="text-white/80 text-sm font-medium">
                    — {es ? theme.labelEs : theme.label}
                  </span>
                  {isActive && (
                    <span className="ml-1 text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full">
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
              className="relative mx-auto"
              style={{
                height: `${height}px`,
                backgroundColor: theme.bgSection,
                minWidth: "320px",
                maxWidth: "520px",
              }}
            >
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                {/* Track base — all connections */}
                {levelGroup.stations.map((_, idx) => {
                  if (idx === 0) return null;
                  const from = getPos(idx - 1);
                  const to = getPos(idx);
                  return (
                    <line
                      key={`track-${idx}`}
                      x1={`${from.x}%`} y1={from.y}
                      x2={`${to.x}%`} y2={to.y}
                      stroke="#e5e7eb" strokeWidth={6} strokeLinecap="round"
                    />
                  );
                })}
                {/* Progress — completed connections on top */}
                {levelGroup.stations.map((_, idx) => {
                  if (idx === 0) return null;
                  const from = getPos(idx - 1);
                  const to = getPos(idx);
                  const isComplete = (levelGroup.stations[idx - 1].progress?.status || "locked") === "completed";
                  if (!isComplete) return null;
                  return (
                    <line
                      key={`prog-${idx}`}
                      x1={`${from.x}%`} y1={from.y}
                      x2={`${to.x}%`} y2={to.y}
                      stroke={theme.primary} strokeWidth={6} strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* Stations */}
              {levelGroup.stations.map((station, idx) => (
                <StationNode
                  key={station.id}
                  station={station}
                  index={idx}
                  isCurrentStation={station.id === currentStationId}
                  theme={theme}
                  onClick={() => onStationClick(station.id)}
                  language={language}
                />
              ))}
            </div>
          </div>

          {nextTheme && (
            <div className="flex flex-col items-center py-1">
              <div className="w-px h-5" style={{ background: `linear-gradient(to bottom, ${theme.primary}, ${nextTheme.primary})` }} />
              <div
                className="w-7 h-7 rounded-full border-2 bg-white flex items-center justify-center shadow-sm"
                style={{ borderColor: nextTheme.primary }}
              >
                <ChevronDown size={14} style={{ color: nextTheme.primary }} />
              </div>
              <div className="w-px h-5" style={{ background: `linear-gradient(to bottom, ${theme.primary}, ${nextTheme.primary})` }} />
            </div>
          )}
          </Fragment>
        );
      })}
    </div>
  );
}
