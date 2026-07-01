import { Fragment, useState, useEffect } from "react";
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

interface StationRow {
  stations: [Station] | [Station, Station];
  direction: "ltr" | "rtl";
  rowIndex: number;
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

/** Reactive hook — re-evaluates on window resize */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

/** Responsive layout constants */
function getLayout(mobile: boolean) {
  return {
    amplitude: mobile ? 50 : 120,
    nodeSize: mobile ? 60 : 72,
    milestoneSize: mobile ? 68 : 80,
    connectorH: mobile ? 44 : 60,
    baseStroke: mobile ? 6 : 8,
    doneStroke: mobile ? 8 : 10,
    labelMax: mobile ? 90 : 110,
    uturnHeight: 50,
    iconSizes: {
      check: mobile ? 20 : 24,
      lock: mobile ? 16 : 18,
      star: mobile ? 18 : 22,
      play: mobile ? 16 : 19,
    },
  };
}

function getStationOffset(index: number, amplitude: number): number {
  return Math.sin(index * (Math.PI / 3)) * amplitude;
}

/** Group stations into rows of 2 with alternating direction */
function pairStations(stations: Station[]): StationRow[] {
  const rows: StationRow[] = [];
  for (let i = 0; i < stations.length; i += 2) {
    const isEvenRow = rows.length % 2 === 0;
    if (i + 1 < stations.length) {
      rows.push({
        stations: [stations[i], stations[i + 1]],
        direction: isEvenRow ? "ltr" : "rtl",
        rowIndex: rows.length,
      });
    } else {
      rows.push({
        stations: [stations[i]],
        direction: isEvenRow ? "ltr" : "rtl",
        rowIndex: rows.length,
      });
    }
  }
  return rows;
}

/** Small inline SVG connector between two adjacent stations (mobile single-column) */
function ConnectorSVG({
  fromOffsetX,
  toOffsetX,
  prevStatus,
  theme,
  layout,
}: {
  fromOffsetX: number;
  toOffsetX: number;
  prevStatus: string | undefined;
  theme: typeof LEVEL_THEME.A1;
  layout: ReturnType<typeof getLayout>;
}) {
  const HEIGHT = layout.connectorH;
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
        <path
          d={d}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={layout.baseStroke}
          strokeDasharray="12 8"
          strokeLinecap="round"
        />
        {isCompleted && (
          <motion.path
            d={d}
            fill="none"
            stroke={theme.primary}
            strokeWidth={layout.doneStroke}
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

/** Horizontal S-curve connector between two stations in a row (desktop zigzag) */
function HorizontalConnectorSVG({
  direction,
  prevStatus,
  theme,
  layout,
}: {
  direction: "ltr" | "rtl";
  prevStatus: string | undefined;
  theme: typeof LEVEL_THEME.A1;
  layout: ReturnType<typeof getLayout>;
}) {
  const isCompleted = prevStatus === "completed";
  const W = 200;
  const H = 40;
  const startX = direction === "ltr" ? 20 : W - 20;
  const endX = direction === "ltr" ? W - 20 : 20;
  const midX = W / 2;
  const d = `M ${startX} ${H / 2} C ${midX} ${H * 0.1}, ${midX} ${H * 0.9}, ${endX} ${H / 2}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="absolute inset-0 w-full pointer-events-none"
      style={{ top: "50%", height: "40px", marginTop: "-20px" }}
    >
      <path
        d={d}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={layout.baseStroke}
        strokeDasharray="12 8"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {isCompleted && (
        <motion.path
          d={d}
          fill="none"
          stroke={theme.primary}
          strokeWidth={layout.doneStroke}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 6px ${theme.primary}88)` }}
        />
      )}
    </svg>
  );
}

/** Vertical U-turn connector between zigzag rows (desktop) */
function UTurnConnectorSVG({
  fromColumn,
  prevStatus,
  theme,
  layout,
}: {
  fromColumn: "left" | "right";
  prevStatus: string | undefined;
  theme: typeof LEVEL_THEME.A1;
  layout: ReturnType<typeof getLayout>;
}) {
  const isCompleted = prevStatus === "completed";
  const H = layout.uturnHeight;
  const W = 200;
  // Position at the column where the previous row ended
  const x = fromColumn === "left" ? 50 : W - 50;
  // The next row starts at the same column (since ltr ends right, rtl starts right)
  const d = `M ${x} 0 C ${x} ${H * 0.5}, ${x} ${H * 0.5}, ${x} ${H}`;

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
        style={{ width: "100%", maxWidth: "600px", height: `${H}px` }}
      >
        <path
          d={d}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={layout.baseStroke}
          strokeDasharray="12 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {isCompleted && (
          <motion.path
            d={d}
            fill="none"
            stroke={theme.primary}
            strokeWidth={layout.doneStroke}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
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
  layout,
}: {
  station: Station;
  index: number;
  offsetX: number;
  isCurrentStation: boolean;
  theme: typeof LEVEL_THEME.A1;
  onClick: () => void;
  language: string;
  layout: ReturnType<typeof getLayout>;
}) {
  const status = station.progress?.status || "locked";
  const title = language === "es" ? station.titleEs : station.title;
  const isMilestone = station.stationType === "milestone";
  const canClick = status !== "locked";

  const nodeSize = isMilestone ? layout.milestoneSize : layout.nodeSize;

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
    if (status === "completed") return <Check size={layout.iconSizes.check} color="white" strokeWidth={2.5} />;
    if (status === "locked") return <Lock size={layout.iconSizes.lock} color={styles.iconColor} />;
    if (isMilestone) return <Star size={layout.iconSizes.star} color={styles.iconColor} fill={status !== "locked" ? styles.iconColor : "none"} />;
    return <Play size={layout.iconSizes.play} color={styles.iconColor} fill={styles.iconColor} />;
  })();

  return (
    <motion.div
      className="flex flex-col items-center flex-shrink-0"
      style={{
        transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
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
            className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-accent border-2 border-white shadow-lg flex items-center justify-center"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-white text-[9px] font-bold">★</span>
          </motion.div>
        )}
      </div>

      <span
        className="mt-2 text-[11px] sm:text-xs font-medium text-center leading-tight line-clamp-2 px-1"
        style={{
          color: status === "locked" ? "#9ca3af" : "#374151",
          maxWidth: `${layout.labelMax}px`,
          minHeight: "28px",
        }}
      >
        {title}
      </span>
    </motion.div>
  );
}

/** Desktop 2-column zigzag path layout */
function ZigzagPath({
  stations,
  theme,
  currentStationId,
  onStationClick,
  language,
  layout,
}: {
  stations: Station[];
  theme: typeof LEVEL_THEME.A1;
  currentStationId: number | null;
  onStationClick: (id: number) => void;
  language: string;
  layout: ReturnType<typeof getLayout>;
}) {
  const rows = pairStations(stations);

  return (
    <div className="flex flex-col py-6 sm:py-8 px-2 sm:px-4">
      {rows.map((row, rowIdx) => {
        const isSingle = row.stations.length === 1;
        const isLtr = row.direction === "ltr";
        const prevRow = rows[rowIdx - 1];

        // Determine U-turn connector position
        const fromColumn = prevRow
          ? prevRow.direction === "ltr" ? "right" : "left"
          : "left";

        // Get the status of the last station in the previous row for connector coloring
        const prevRowLastStation = prevRow
          ? prevRow.stations[prevRow.stations.length - 1]
          : null;
        const uturnPrevStatus = prevRowLastStation?.progress?.status;

        // Get the status of the first station in this row for horizontal connector
        const horizontalPrevStatus = row.stations[0]?.progress?.status;

        return (
          <Fragment key={rowIdx}>
            {/* U-turn connector between rows */}
            {rowIdx > 0 && (
              <UTurnConnectorSVG
                fromColumn={fromColumn}
                prevStatus={uturnPrevStatus}
                theme={theme}
                layout={layout}
              />
            )}

            {/* Station row */}
            <div
              className="relative grid items-center"
              style={{
                gridTemplateColumns: isSingle ? "1fr" : "1fr 1fr",
                minHeight: layout.nodeSize + 44,
              }}
            >
              {/* Horizontal connector between the two stations in this row */}
              {!isSingle && (
                <HorizontalConnectorSVG
                  direction={row.direction}
                  prevStatus={horizontalPrevStatus}
                  theme={theme}
                  layout={layout}
                />
              )}

              {/* Render stations in correct order based on direction */}
              {isSingle ? (
                <div className="flex justify-center" style={{ gridColumn: "1 / -1" }}>
                  <StationNode
                    station={row.stations[0]}
                    index={rowIdx * 2}
                    offsetX={0}
                    isCurrentStation={row.stations[0].id === currentStationId}
                    theme={theme}
                    onClick={() => onStationClick(row.stations[0].id)}
                    language={language}
                    layout={layout}
                  />
                </div>
              ) : (() => {
                const [first, second] = row.stations as [Station, Station];
                const leftStation = isLtr ? first : second;
                const rightStation = isLtr ? second : first;
                const leftIndex = isLtr ? rowIdx * 2 : rowIdx * 2 + 1;
                const rightIndex = isLtr ? rowIdx * 2 + 1 : rowIdx * 2;
                return (
                  <>
                    <div className="flex justify-center">
                      <StationNode
                        station={leftStation}
                        index={leftIndex}
                        offsetX={0}
                        isCurrentStation={leftStation.id === currentStationId}
                        theme={theme}
                        onClick={() => onStationClick(leftStation.id)}
                        language={language}
                        layout={layout}
                      />
                    </div>
                    <div className="flex justify-center">
                      <StationNode
                        station={rightStation}
                        index={rightIndex}
                        offsetX={0}
                        isCurrentStation={rightStation.id === currentStationId}
                        theme={theme}
                        onClick={() => onStationClick(rightStation.id)}
                        language={language}
                        layout={layout}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </Fragment>
        );
      })}
    </div>
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
  layout,
  isMobile,
}: {
  levelGroup: LevelGroup;
  theme: typeof LEVEL_THEME.A1;
  isActive: boolean;
  currentStationId: number | null;
  onStationClick: (id: number) => void;
  language: string;
  es: boolean;
  layout: ReturnType<typeof getLayout>;
  isMobile: boolean;
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
        className="px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4"
        style={{ background: theme.gradient }}
      >
        <div className="p-2 sm:p-2.5 rounded-xl bg-white/20 flex-shrink-0 backdrop-blur-sm">
          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-bold text-base sm:text-lg">{levelGroup.level}</span>
            <span className="text-white/80 text-xs sm:text-sm font-medium truncate">
              — {es ? theme.labelEs : theme.label}
            </span>
            {isActive && (
              <span className="ml-1 text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full backdrop-blur-sm flex-shrink-0">
                {es ? "Actual" : "Current"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-card"
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

      {/* Path: mobile = single column, desktop = 2-column zigzag */}
      {isMobile ? (
        <div className="flex flex-col items-center py-6 overflow-x-hidden">
          {levelGroup.stations.map((station, i) => {
            const currOffset = getStationOffset(i, layout.amplitude);
            const prevOffset = i > 0 ? getStationOffset(i - 1, layout.amplitude) : 0;
            const prevStatus = i > 0 ? levelGroup.stations[i - 1].progress?.status : undefined;

            return (
              <Fragment key={station.id}>
                {i > 0 && (
                  <ConnectorSVG
                    fromOffsetX={prevOffset}
                    toOffsetX={currOffset}
                    prevStatus={prevStatus}
                    theme={theme}
                    layout={layout}
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
                  layout={layout}
                />
              </Fragment>
            );
          })}
        </div>
      ) : (
        <ZigzagPath
          stations={levelGroup.stations}
          theme={theme}
          currentStationId={currentStationId}
          onStationClick={onStationClick}
          language={language}
          layout={layout}
        />
      )}
    </div>
  );
}

export default function SnakePath({ levels, currentLevel, onStationClick }: SnakePathProps) {
  const { language } = useLanguage();
  const es = language === "es";
  const isMobile = useIsMobile();
  const layout = getLayout(isMobile);

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
    <div className={`w-full mx-auto flex flex-col gap-4 sm:gap-5 ${isMobile ? "max-w-lg" : "max-w-2xl"}`}>
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
              layout={layout}
              isMobile={isMobile}
            />
            {nextTheme && (
              <div className="flex flex-col items-center py-1">
                <div
                  className="w-0.5 h-5 sm:h-6 rounded-full"
                  style={{ background: `linear-gradient(to bottom, ${theme.primary}, ${nextTheme.primary})` }}
                />
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 bg-card flex items-center justify-center shadow-md"
                  style={{ borderColor: nextTheme.primary }}
                >
                  <ChevronDown size={14} style={{ color: nextTheme.primary }} />
                </div>
                <div
                  className="w-0.5 h-5 sm:h-6 rounded-full"
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
