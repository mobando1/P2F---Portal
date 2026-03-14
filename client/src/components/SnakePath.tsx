import { motion } from "framer-motion";
import { Lock, Check, Play, Star } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import LevelBadge from "./LevelBadge";

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

const LEVEL_THEME: Record<string, { primary: string; bg: string; line: string }> = {
  A1: { primary: "#10b981", bg: "#d1fae5", line: "#6ee7b7" },
  A2: { primary: "#14b8a6", bg: "#ccfbf1", line: "#5eead4" },
  B1: { primary: "#1C7BB1", bg: "#EAF4FA", line: "#7cc3e6" },
  B2: { primary: "#6366f1", bg: "#e0e7ff", line: "#a5b4fc" },
  C1: { primary: "#F59E1C", bg: "#fef3c7", line: "#fcd34d" },
  C2: { primary: "#eab308", bg: "#fef9c3", line: "#fde047" },
};

function StationNode({
  station,
  index,
  total,
  isCurrentStation,
  theme,
  onClick,
  language,
}: {
  station: Station;
  index: number;
  total: number;
  isCurrentStation: boolean;
  theme: typeof LEVEL_THEME.A1;
  onClick: () => void;
  language: string;
}) {
  const status = station.progress?.status || "locked";
  const title = language === "es" ? station.titleEs : station.title;

  // Snake layout: odd rows go right, even rows go left
  const row = Math.floor(index / 3);
  const colInRow = index % 3;
  const isReversed = row % 2 === 1;
  const col = isReversed ? 2 - colInRow : colInRow;

  const xPercent = 15 + col * 35;
  const yOffset = row * 120 + 60;

  const getStatusStyles = () => {
    switch (status) {
      case "completed":
        return {
          bg: theme.primary,
          border: theme.primary,
          iconColor: "white",
          opacity: 1,
        };
      case "available":
        return {
          bg: "white",
          border: theme.primary,
          iconColor: theme.primary,
          opacity: 1,
        };
      case "in_progress":
        return {
          bg: theme.bg,
          border: theme.primary,
          iconColor: theme.primary,
          opacity: 1,
        };
      default: // locked
        return {
          bg: "#f3f4f6",
          border: "#d1d5db",
          iconColor: "#9ca3af",
          opacity: 0.6,
        };
    }
  };

  const styles = getStatusStyles();

  const getIcon = () => {
    if (status === "completed") return <Check size={20} color="white" />;
    if (status === "locked") return <Lock size={16} color={styles.iconColor} />;
    if (station.stationType === "milestone") return <Star size={18} color={styles.iconColor} />;
    return <Play size={16} color={styles.iconColor} />;
  };

  return (
    <motion.div
      className="absolute flex flex-col items-center cursor-pointer"
      style={{
        left: `${xPercent}%`,
        top: `${yOffset}px`,
        transform: "translate(-50%, -50%)",
        opacity: styles.opacity,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: styles.opacity }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 300, damping: 25 }}
      onClick={() => status !== "locked" && onClick()}
      whileHover={status !== "locked" ? { scale: 1.1 } : {}}
      whileTap={status !== "locked" ? { scale: 0.95 } : {}}
    >
      {/* Station circle */}
      <div
        className="relative flex items-center justify-center rounded-full shadow-md"
        style={{
          width: station.stationType === "milestone" ? 56 : 48,
          height: station.stationType === "milestone" ? 56 : 48,
          backgroundColor: styles.bg,
          border: `3px solid ${styles.border}`,
        }}
      >
        {getIcon()}

        {/* Pulsing ring for available stations */}
        {status === "available" && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${theme.primary}` }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Current station avatar indicator */}
        {isCurrentStation && (
          <motion.div
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-orange-400 border-2 border-white shadow"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Station label */}
      <span
        className="mt-1.5 text-xs font-medium text-center max-w-[90px] leading-tight"
        style={{ color: status === "locked" ? "#9ca3af" : "#374151" }}
      >
        {title}
      </span>
    </motion.div>
  );
}

export default function SnakePath({ levels, currentLevel, onStationClick }: SnakePathProps) {
  const { language } = useLanguage();

  // Find the current station (first available station in current level)
  let currentStationId: number | null = null;
  for (const level of levels) {
    if (level.level === currentLevel) {
      const available = level.stations.find(
        s => s.progress?.status === "available" || s.progress?.status === "in_progress"
      );
      if (available) {
        currentStationId = available.id;
        break;
      }
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      {levels.map((levelGroup) => {
        const theme = LEVEL_THEME[levelGroup.level] || LEVEL_THEME.A1;
        const rows = Math.ceil(levelGroup.stations.length / 3);
        const height = rows * 120 + 60;

        return (
          <div key={levelGroup.level} className="mb-6">
            {/* Level header */}
            <div className="flex items-center gap-3 mb-4 px-2">
              <LevelBadge level={levelGroup.level} size="lg" />
              <div className="flex-1 h-px" style={{ backgroundColor: theme.line }} />
            </div>

            {/* Snake path for this level */}
            <div
              className="relative rounded-xl mx-auto"
              style={{
                height: `${height}px`,
                backgroundColor: theme.bg,
                minWidth: "320px",
                maxWidth: "500px",
              }}
            >
              {/* Connection lines between stations */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
              >
                {levelGroup.stations.map((station, idx) => {
                  if (idx === 0) return null;
                  const prevStation = levelGroup.stations[idx - 1];

                  const getPos = (i: number) => {
                    const row = Math.floor(i / 3);
                    const colInRow = i % 3;
                    const isReversed = row % 2 === 1;
                    const col = isReversed ? 2 - colInRow : colInRow;
                    return {
                      x: 15 + col * 35,
                      y: row * 120 + 60,
                    };
                  };

                  const from = getPos(idx - 1);
                  const to = getPos(idx);

                  const prevStatus = prevStation.progress?.status || "locked";
                  const lineColor = prevStatus === "completed" ? theme.primary : theme.line;

                  return (
                    <line
                      key={`line-${idx}`}
                      x1={`${from.x}%`}
                      y1={from.y}
                      x2={`${to.x}%`}
                      y2={to.y}
                      stroke={lineColor}
                      strokeWidth={3}
                      strokeDasharray={prevStatus === "completed" ? "none" : "6 4"}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* Station nodes */}
              {levelGroup.stations.map((station, idx) => (
                <StationNode
                  key={station.id}
                  station={station}
                  index={idx}
                  total={levelGroup.stations.length}
                  isCurrentStation={station.id === currentStationId}
                  theme={theme}
                  onClick={() => onStationClick(station.id)}
                  language={language}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
