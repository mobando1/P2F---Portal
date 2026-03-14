import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getQueryFn } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { pageTransition, fadeInUp, staggerContainer } from "@/lib/animations";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BookOpen, Trophy, Brain, BarChart3 } from "lucide-react";
import Header from "@/components/header";
import SnakePath from "@/components/SnakePath";
import StationDetail from "@/components/StationDetail";
import AssignmentCard from "@/components/AssignmentCard";
import LevelBadge from "@/components/LevelBadge";

export default function LearningPathPage() {
  const { language } = useLanguage();
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
      <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-[#0A4A6E]">
            {language === "es" ? "Mi Camino" : "My Path"}
          </h1>
          <LevelBadge level={currentLevel} size="lg" animate />
        </div>
        <p className="text-muted-foreground">
          {language === "es"
            ? "Tu progreso en el programa de espanol"
            : "Your progress in the Spanish program"}
        </p>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
      >
        {[
          {
            icon: BarChart3,
            label: language === "es" ? "Progreso" : "Progress",
            value: `${progressPercent}%`,
            color: "#1C7BB1",
          },
          {
            icon: BookOpen,
            label: language === "es" ? "Estaciones" : "Stations",
            value: `${stats.totalCompleted}/${stats.totalStations}`,
            color: "#10b981",
          },
          {
            icon: Brain,
            label: language === "es" ? "Promedio Quiz" : "Quiz Avg",
            value: stats.quizAvgScore > 0 ? `${stats.quizAvgScore}%` : "—",
            color: "#F59E1C",
          },
          {
            icon: Trophy,
            label: language === "es" ? "Clases" : "Classes",
            value: String(stats.classesCompleted),
            color: "#6366f1",
          },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={fadeInUp}>
            <Card>
              <CardContent className="flex items-center gap-3 py-4 px-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Assignments section */}
      {pendingAssignments.length > 0 && (
        <motion.div variants={fadeInUp} className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-[#0A4A6E]">
            {language === "es" ? "Actividades Asignadas" : "Assigned Activities"}
          </h2>
          <div className="space-y-2">
            {pendingAssignments.map((assignment: any) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Snake Path */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-lg font-semibold mb-4 text-[#0A4A6E]">
          {language === "es" ? "Camino de Aprendizaje" : "Learning Path"}
        </h2>
        {levels.length > 0 ? (
          <SnakePath
            levels={levels}
            currentLevel={currentLevel}
            onStationClick={(id) => setSelectedStation(id)}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {language === "es"
                ? "El camino de aprendizaje se esta preparando. Pronto estara disponible."
                : "The learning path is being prepared. It will be available soon."}
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Station Detail Dialog */}
      <StationDetail
        stationId={selectedStation}
        open={selectedStation !== null}
        onClose={() => setSelectedStation(null)}
        onStationCompleted={() => {
          refetch();
          setSelectedStation(null);
        }}
      />
    </motion.div>
      </main>
    </div>
  );
}
