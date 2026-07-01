import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getQueryFn } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { Loader2, BookOpen, Trophy, Brain, TrendingUp, ClipboardList } from "lucide-react";
import Header from "@/components/header";
import SnakePath from "@/components/SnakePath";
import StationDetail from "@/components/StationDetail";
import AssignmentCard from "@/components/AssignmentCard";
import LevelBadge from "@/components/LevelBadge";
import { Coachmark } from "@/components/onboarding/Coachmark";

// Radial progress SVG — responsive size
function RadialProgress({ percent, color, size = 72 }: { percent: number; color: string; size?: number }) {
  const r = size * 0.39; // ~28 at 72px
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const half = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={half} cy={half} r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle
        cx={half} cy={half} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

export default function LearningPathPage() {
  const { language } = useLanguage();
  const es = language === "es";
  const [selectedStation, setSelectedStation] = useState<number | null>(null);

  const { data: pathData, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/learning-path"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: assignments } = useQuery<any[]>({
    queryKey: ["/api/learning-path/assignments"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {es ? "No pudimos cargar tu camino" : "Couldn't load your path"}
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            {es
              ? "Hubo un problema al cargar tu progreso. Intenta de nuevo."
              : "There was a problem loading your progress. Please try again."}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-900 transition-colors"
          >
            {es ? "Reintentar" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  const { currentLevel, levels, stats } = pathData || {
    currentLevel: "A1",
    levels: [],
    stats: { totalCompleted: 0, totalStations: 0, quizAvgScore: 0, classesCompleted: 0 },
  };

  const progressPercent = stats.totalStations > 0
    ? Math.round((stats.totalCompleted / stats.totalStations) * 100)
    : 0;

  const pendingAssignments = (assignments || []).filter((a: any) => a.status !== "completed");

  const statCards = [
    {
      icon: TrendingUp,
      label: es ? "Progreso" : "Progress",
      value: `${progressPercent}%`,
      color: "#1C7BB1",
      bg: "#EAF4FA",
    },
    {
      icon: BookOpen,
      label: es ? "Estaciones" : "Stations",
      value: `${stats.totalCompleted}/${stats.totalStations}`,
      color: "#10b981",
      bg: "#d1fae5",
    },
    {
      icon: Brain,
      label: es ? "Quiz Promedio" : "Quiz Avg",
      value: stats.quizAvgScore > 0 ? `${stats.quizAvgScore}%` : "—",
      color: "#F59E1C",
      bg: "#fef3c7",
    },
    {
      icon: Trophy,
      label: es ? "Clases" : "Classes",
      value: String(stats.classesCompleted),
      color: "#6366f1",
      bg: "#ede9fe",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1C7BB1] via-[#0E5A8A] to-[#0A4A6E] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
          >
            {/* Radial progress — smaller on mobile */}
            <div className="relative flex-shrink-0">
              <div className="hidden sm:block">
                <RadialProgress percent={progressPercent} color="#F59E1C" size={72} />
              </div>
              <div className="block sm:hidden">
                <RadialProgress percent={progressPercent} color="#F59E1C" size={56} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-bold text-white">{progressPercent}%</span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold">
                  {es ? "Mi Camino" : "My Learning Path"}
                </h1>
                <LevelBadge level={currentLevel} size="lg" animate />
              </div>
              <p className="text-blue-200 text-sm">
                {es
                  ? "Tu progreso personalizado en el programa de español"
                  : "Your personalized progress in the Spanish program"}
              </p>
              {stats.totalStations > 0 && (
                <div className="mt-3 bg-white/10 rounded-full h-2 w-full max-w-xs overflow-hidden">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.9, delay: 0.3 }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Stat cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 -mt-6"
        >
          {statCards.map((s, i) => (
            <motion.div key={i} variants={fadeInUp}>
              <div className="bg-card rounded-2xl shadow-sm border border-white/80 p-3 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:gap-2">
                <div className="p-2 sm:p-2.5 rounded-xl" style={{ backgroundColor: s.bg }}>
                  <s.icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: s.color }} />
                </div>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium leading-tight">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Assignments */}
        {pendingAssignments.length > 0 && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">
                {es ? "Actividades Asignadas" : "Assigned Activities"}
                <span className="ml-2 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingAssignments.length}
                </span>
              </h2>
            </div>
            <div className="space-y-2">
              {pendingAssignments.map((a: any) => (
                <AssignmentCard key={a.id} assignment={a} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Snake path */}
        <Coachmark
          id="learning-path-intro"
          title={es ? "Tu Camino de Aprendizaje" : "Your Learning Path"}
          description={es
            ? "Cada círculo es una estación con lecciones y quizzes. Completa una estación para desbloquear la siguiente."
            : "Each circle is a station with lessons and quizzes. Complete a station to unlock the next one."}
          position="top"
          delay={800}
        >
          <div>
            {levels.length > 0 ? (
              <SnakePath
                levels={levels}
                currentLevel={currentLevel}
                onStationClick={(id) => setSelectedStation(id)}
              />
            ) : (
              <div className="bg-card rounded-2xl shadow-sm border border-border py-16 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {es
                    ? "El camino de aprendizaje se está preparando. Pronto estará disponible."
                    : "The learning path is being prepared. It will be available soon."}
                </p>
              </div>
            )}
          </div>
        </Coachmark>

        {/* Station detail dialog */}
        <StationDetail
          stationId={selectedStation}
          open={selectedStation !== null}
          onClose={() => setSelectedStation(null)}
          onStationCompleted={() => {
            refetch();
            setSelectedStation(null);
          }}
        />
      </main>
    </div>
  );
}
