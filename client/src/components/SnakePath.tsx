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

// Duolingo-style sine-wave offsets — dramatic winding like reference designs
const WAVE_AMPLITUDE = typeof window !== "undefined" && window.innerWidth < 640 ? 60 : 120;

function getStationOffset(index: number): number {
  return Math.sin(index * (Math.PI / 3)) * WAVE_AMPLITUDE;
}

/** Small inline SVG connector between two adjacent stations */
function ConnectorSVG({
  fromOffsetX,
  toOffsetX,
  prevStatus,
  theme,
}: {
  fromOffsetX: number;
  toOffsetX: number;
  prevStatus: string | undefined;
  theme: typeof LEVEL_THEME.A1;
}) {
  const HEIGHT = 60;
  const isCompleted = prevStatus === "completed";

  const minX = Math.min(fromOffsetX, toOffsetX);
  const maxX = Math.max(fromOffsetX, toOffsetX);
  const padding = 30;
  const svgWidth = Math.max(maxX - minX + padding * 2, 80);
  const centerOffset = (minX + maxX) / 2;

  const localFromX = fromOffsetX - centerOffset + svgWidth / 2;
  const localToX = toOffsetX - centerOffset + svgWidth / 2;

  const midY = HEIGHT / 2;
  const d = `M ${localFromX} 0 C ${localFromX} ${midY}, ${localToX} ${midY}, ${localToX} ${HEIGHT}`;

  return (
    <div
      className="flex-shrink-0"
      style={{ transform: `translateX(${centerOffset}px)` }}
    >
      <svg
        width={svgWidth}
        height={HEIGHT}
        viewBox={`0 0 ${svgWidth} ${HEIGHT}`}
        className="overflow-visible"
      >
        {/* Base dashed track — thick road-like trail */}
        <path
          d={d}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={8}
          strokeDasharray="12 8"
          strokeLinecap="round"
        />
        {/* Completed solid track — thick with glow */}
        {isCompleted && (
          <motion.path
            d={d}
            fill="none"
            stroke={theme.primary}
            strokeWidth={10}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{ filter: `drop-shadow(0 0 6px ${theme.primary}88)` }}
          />
        )}
      </svg>
    </div>
  );
}

function StationNode({
  station,
  index,
  offsetX,
  isCurrentStation,
  theme,
  onClick,
  language,
}: {
  station: Station;
  index: number;
  offsetX: number;
  isCurrentStation: boolean;
  theme: typeof LEVEL_THEME.A1;
  onClick: () => void;
  language: string;
}) {
  const status = station.progress?.status || "locked";
  const title = language === "es" ? station.titleEs : station.title;
  const isMilestone = station.stationType === "milestone";
  const canClick = status !== "locked";

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
      className="flex flex-col items-center flex-shrink-0"
      style={{
        transform: `translateX(${offsetX}px)`,
        opacity: status === "locked" ? 0.5 : 1,
        cursor: canClick ? "pointer" : "default",
      }}
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: status === "locked" ? 0.5 : 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 280, damping: 22 }}
      onClick={() => canClick && onClick()}
      whileHover={canClick ? { scale: 1.1, y: -2 } : {}}
      whileTap={canClick ? { scale: 0.93 } : {}}
    >
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

        {status === "completed" && station.progress?.score != null && (
          <div
            className="absolute -bottom-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: theme.primary, border: "2px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
          >
            {station.progress.score}%
          </div>
        )}

        {status === "available" && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: `2px solid ${theme.primary}` }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        )}

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

      <span
        className="mt-2.5 text-xs font-medium text-center leading-tight line-clamp-2 px-1"
        style={{
          color: status === "locked" ? "#9ca3af" : "#374151",
          maxWidth: "110px",
          minHeight: "32px",
        }}
      >
        {title}
      </span>
    </motion.div>
  );
}

/** Individual level section */
function LevelSection({
  levelGroup,
  theme,
  isActive,
  currentStationId,
  onStationClick,
  language,
  es,
}: {
  levelGroup: LevelGroup;
  theme: typeof LEVEL_THEME.A1;
  isActive: boolean;
  currentStationId: number | null;
  onStationClick: (id: number) => void;
  language: string;
  es: boolean;
}) {
  const completed = levelGroup.stations.filter(s => s.progress?.status === "completed").length;
  const total = levelGroup.stations.length;

  return (
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

      {/* Vertical winding path */}
      <div className="flex flex-col items-center py-8 overflow-hidden">
        {levelGroup.stations.map((station, i) => {
          const currOffset = getStationOffset(i);
          const prevOffset = i > 0 ? getStationOffset(i - 1) : 0;
          const prevStatus = i > 0 ? levelGroup.stations[i - 1].progress?.status : undefined;

          return (
            <Fragment key={station.id}>
              {i > 0 && (
                <ConnectorSVG
                  fromOffsetX={prevOffset}
                  toOffsetX={currOffset}
                  prevStatus={prevStatus}
                  theme={theme}
                />
              )}
              <StationNode
                station={station}
                index={i}
                offsetX={currOffset}
                isCurrentStation={station.id === currentStationId}
                theme={theme}
                onClick={() => onStationClick(station.id)}
                language={language}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
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
    <div className="w-full max-w-lg mx-auto flex flex-col gap-5">
      {levels.map((levelGroup, idx) => {
        const theme = LEVEL_THEME[levelGroup.level] || LEVEL_THEME.A1;
        const nextGroup = levels[idx + 1];
        const nextTheme = nextGroup ? (LEVEL_THEME[nextGroup.level] || LEVEL_THEME.A1) : null;

        return (
          <Fragment key={levelGroup.level}>
            <LevelSection
              levelGroup={levelGroup}
              theme={theme}
              isActive={levelGroup.level === currentLevel}
              currentStationId={currentStationId}
              onStationClick={onStationClick}
              language={language}
              es={es}
            />
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
