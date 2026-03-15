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

// Radial progress SVG
function RadialProgress({ percent, color }: { percent: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="6"
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

  const { data: pathData, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/learning-path"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: assignments } = useQuery<any[]>({
    queryKey: ["/api/learning-path/assignments"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin h-8 w-8 text-[#1C7BB1]" />
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
    <div className="min-h-screen bg-[#F0F4F8]">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1C7BB1] via-[#0E5A8A] to-[#0A4A6E] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
          >
            {/* Radial progress */}
            <div className="relative flex-shrink-0">
              <RadialProgress percent={progressPercent} color="#F59E1C" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{progressPercent}%</span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">
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
                    className="h-full bg-[#F59E1C] rounded-full"
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stat cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 -mt-6"
        >
          {statCards.map((s, i) => (
            <motion.div key={i} variants={fadeInUp}>
              <div className="bg-white rounded-2xl shadow-sm border border-white/80 p-4 flex flex-col items-center text-center gap-2">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: s.bg }}>
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] text-gray-500 font-medium leading-tight">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Assignments */}
        {pendingAssignments.length > 0 && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-4 w-4 text-[#F59E1C]" />
              <h2 className="text-sm font-semibold text-[#0A4A6E] uppercase tracking-wide">
                {es ? "Actividades Asignadas" : "Assigned Activities"}
                <span className="ml-2 bg-[#F59E1C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center">
                <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
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
