import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, refreshUserAndCredits, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Coachmark } from "@/components/onboarding/Coachmark";
import SubscriptionCard from "@/components/subscription-card";
import { ClassCard } from "@/components/ClassCard";
import RescheduleDialog from "@/components/RescheduleDialog";
import { AttendanceConfirmationBanner } from "@/components/AttendanceConfirmationBanner";
import { DashboardSkeleton } from "@/components/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  CalendarCheck,
  GraduationCap,
  Clock,
  Star,
  BookOpen,
  Headphones,
  Users,
  Sparkles,
  MessageCircle,
  TrendingUp,
  Flame,
  Trophy,
  LifeBuoy,
  Gift,
  ShoppingCart,
  Compass,
} from "lucide-react";

// Animated counter hook
function useAnimatedCounter(end: number, duration = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (end === 0) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return count;
}

interface DashboardData {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    level: string;
    avatar?: string;
  };
  subscription: any;
  progress: any;
  upcomingClasses: any[];
  recentCompletedClasses: Array<{
    id: number;
    title: string;
    scheduledAt: string;
    sharedNotes: string | null;
    homeworkText: string | null;
  }>;
  stats: {
    classesBooked: number;
    classesCompleted: number;
    learningHours: string;
    currentLevel: string;
    remainingClasses: number;
  };
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const { t, language } = useLanguage();
  const [rescheduleClass, setRescheduleClass] = useState<any>(null);

  // ALL hooks must be called before any conditional returns (React Rules of Hooks)
  // The Flight Plan card only appears once a plan has actually been sent.
  const { data: planSummary } = useQuery<{
    hasPlan: boolean; headline?: string; cefrLevel?: string | null;
    sessionsPerWeek?: number | null; durationWeeks?: number | null; version?: number;
  }>({
    queryKey: ["study-plan-summary"],
    queryFn: async () => {
      const res = await fetch("/api/study-plans/me/summary");
      if (!res.ok) return { hasPlan: false };
      return res.json();
    },
    retry: false,
  });

  const { data: dashboardData, isLoading: isDashboardLoading, isError: isDashboardError, error: dashboardError } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", user?.id],
    enabled: !!user,
  });

  const { data: achievements } = useQuery<Array<{
    id: number;
    type: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: string;
  }>>({
    queryKey: ["/api/achievements", user?.id],
    queryFn: () => apiRequest("GET", `/api/achievements/${user!.id}`).then(res => res.json()),
    enabled: !!user,
  });

  const { data: aiUsage } = useQuery<{
    messagesUsed: number;
    remaining: number;
    isSubscribed: boolean;
    limit: number | null;
  }>({
    queryKey: ["/api/ai/usage"],
    enabled: !!user,
  });

  const cancelClassMutation = useMutation({
    mutationFn: async (classId: number) => {
      const response = await apiRequest("PUT", `/api/classes/${classId}/cancel`, {
        userId: user!.id,
      });
      return response.json();
    },
    onSuccess: async () => {
      await refreshUserAndCredits(queryClient, user?.id);
      toast({
        title: language === 'es' ? "Clase cancelada" : "Class cancelled",
        description: language === 'es' ? "Tu clase ha sido cancelada." : "Your class has been cancelled successfully.",
      });
    },
    onError: () => {
      toast({
        title: language === 'es' ? "Error" : "Cancellation failed",
        description: language === 'es' ? "No se pudo cancelar la clase." : "Unable to cancel the class. Please try again.",
        variant: "destructive",
      });
    },
  });

  const customerPortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-customer-portal-session", {
        userId: user!.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Unable to open subscription management. Please try again.",
        variant: "destructive",
      });
    },
  });

  const upgradePortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-upgrade-portal-session", {
        userId: user!.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Unable to open plan upgrade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle query errors — attempt session recovery before redirecting
  useEffect(() => {
    if (!isDashboardError) return;
    console.error('Dashboard query failed:', dashboardError);

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            localStorage.setItem('passport2fluency_user', JSON.stringify(data.user));
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard", user?.id] });
            return;
          }
        }
      } catch {}

      toast({
        title: language === 'es' ? "Sesión expirada" : "Session expired",
        description: language === 'es' ? "Por favor inicia sesión de nuevo" : "Please log in again",
        variant: "destructive",
      });
      queryClient.clear();
      localStorage.removeItem('passport2fluency_user');
      setLocation("/login");
    })();
  }, [isDashboardError]);

  const handleCancelClass = (classId: number) => {
    cancelClassMutation.mutate(classId);
  };

  // Redirect if not authenticated (AFTER all hooks)
  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  if (isDashboardError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (isDashboardLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-1/3 mb-6" />
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    classesBooked: 0,
    classesCompleted: 0,
    learningHours: "0.00",
    currentLevel: "A1",
    remainingClasses: 0,
  };

  const upcomingClasses = dashboardData?.upcomingClasses || [];
  const recentCompletedClasses = (dashboardData?.recentCompletedClasses || []).filter(
    c => c.sharedNotes || c.homeworkText
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AttendanceConfirmationBanner />
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t.welcomeName} <span className="text-primary">{dashboardData?.user?.firstName || user.firstName}</span>!
          </h1>
          <p className="text-muted-foreground">{t.continueJourney}</p>
        </motion.div>

        {/* Trial Flow Banner */}
        {!user.trialCompleted && (
          <Coachmark
            id="dashboard-trial"
            title={language === "es" ? "¡Clase de Prueba Gratis!" : "Free Trial Class!"}
            description={language === "es"
              ? "Tienes una clase gratis. Toca 'Reservar Ahora' para elegir tu tutor."
              : "You have a free class. Tap 'Book Now' to pick your tutor."}
            position="bottom"
            delay={500}
          >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-r from-[#F59E1C] to-[#e08a0e] text-white">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Gift className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {language === 'es' ? 'Clase de Prueba Gratis Disponible' : 'Free Trial Class Available'}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {language === 'es'
                        ? 'Reserva tu primera clase de 50 minutos sin costo'
                        : 'Book your first 50-minute class at no cost'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setLocation("/tutors")}
                  className="bg-background text-foreground hover:bg-background/90 font-bold"
                >
                  {language === 'es' ? 'Reservar Ahora' : 'Book Now'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          </Coachmark>
        )}

        {user.trialCompleted && (user.classCredits ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] text-white">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {language === 'es'
                        ? `${user.classCredits} Clase${(user.classCredits ?? 0) > 1 ? 's' : ''} Gratis`
                        : `${user.classCredits} Free Class${(user.classCredits ?? 0) > 1 ? 'es' : ''}`}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {language === 'es'
                        ? 'Tienes créditos disponibles para agendar tu próxima clase'
                        : 'You have credits available to schedule your next class'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setLocation("/tutors")}
                  className="bg-background text-foreground hover:bg-background/90 font-bold"
                >
                  {language === 'es' ? 'Reservar Ahora' : 'Book Now'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {user.trialCompleted && (user.classCredits ?? 0) === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-r from-[#0A4A6E] to-[#1C7BB1] text-white">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {language === 'es' ? 'Continúa Aprendiendo' : 'Keep Learning'}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {language === 'es'
                        ? 'Compra un paquete de clases para seguir practicando'
                        : 'Buy a class package to continue practicing'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setLocation("/packages")}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                >
                  {language === 'es' ? 'Ver Paquetes' : 'View Packages'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Flight Plan — the artifact they were promised. Sits above the stats
            because for a student fresh out of a diagnostic it IS the dashboard. */}
        {planSummary?.hasPlan && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-[#0A4A6E] to-[#1C7BB1] text-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Compass className="w-5 h-5" />
                      <span className="text-sm font-medium opacity-90">
                        {language === "es" ? "Tu Plan de Vuelo" : "Your Flight Plan"}
                      </span>
                      {planSummary.version && planSummary.version > 1 && (
                        <span className="text-xs bg-white/20 rounded px-2 py-0.5">v{planSummary.version}</span>
                      )}
                    </div>
                    <h3 className="text-lg md:text-xl font-bold leading-snug">{planSummary.headline}</h3>
                    <p className="text-sm opacity-90 mt-2">
                      {planSummary.cefrLevel && (
                        <>{language === "es" ? "Nivel" : "Level"} {planSummary.cefrLevel}</>
                      )}
                      {planSummary.sessionsPerWeek && planSummary.durationWeeks && (
                        <>
                          {" · "}
                          {planSummary.sessionsPerWeek}
                          {language === "es" ? " clases por semana · " : " classes per week · "}
                          {planSummary.durationWeeks}
                          {language === "es" ? " semanas" : " weeks"}
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocation("/plan")}
                    className="bg-white text-[#0A4A6E] hover:bg-gray-100 font-semibold shrink-0"
                  >
                    {language === "es" ? "Ver mi plan" : "Open my plan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-8">
          {[
            { label: t.classesBooked, value: stats.classesBooked, icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10" },
            { label: t.classesCompleted, value: stats.classesCompleted, icon: GraduationCap, color: "text-accent", bg: "bg-accent/10" },
            { label: t.learningHours, value: stats.learningHours, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
            { label: t.currentLevel, value: stats.currentLevel, icon: Star, color: "text-accent", bg: "bg-accent/10" },
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeInUp}>
              <Card className="shadow-md border-0 hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-4 md:p-5 flex flex-col items-center text-center">
                  <div className={`p-2.5 rounded-xl ${stat.bg} mb-2`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <motion.div variants={fadeInUp} className="col-span-2 md:col-span-1">
            <Card className="shadow-md border-0 bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] text-white h-full">
              <CardContent className="p-4 md:p-5 flex flex-col items-center text-center">
                <div className="p-2.5 rounded-xl bg-white/15 mb-2">
                  <CalendarCheck className="h-5 w-5 text-white" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.remainingClasses}</p>
                <p className="text-[10px] sm:text-xs text-white/70 font-medium mt-0.5">
                  {language === 'es' ? 'Clases Restantes' : 'Remaining'}
                </p>
                <Button
                  onClick={() => setLocation("/packages")}
                  size="sm"
                  className="bg-background text-foreground hover:bg-background/90 font-medium text-xs mt-2 h-7 px-3"
                >
                  {language === 'es' ? 'Comprar Más' : 'Buy More'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upcoming Classes */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">{t.upcomingClasses}</h2>

                <div className="space-y-4">
                  {upcomingClasses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                        <CalendarCheck className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-muted-foreground mb-2">{t.noUpcomingClasses}</p>
                      <p className="text-muted-foreground/60 text-sm mb-4">
                        {t.reserveFirstClass}
                      </p>
                      <Button
                        onClick={() => setLocation("/tutors")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {t.exploreTutors}
                      </Button>
                    </div>
                  ) : (
                    upcomingClasses.map((classItem: any) => (
                      <ClassCard
                        key={classItem.id}
                        classItem={classItem}
                        onCancel={handleCancelClass}
                        onReschedule={(id) => {
                          const cls = upcomingClasses.find((c: any) => c.id === id);
                          if (cls) setRescheduleClass(cls);
                        }}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tutor notes from recent completed classes */}
            {recentCompletedClasses.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>📝</span>
                    {language === "es" ? "Notas de tu tutor" : "Notes from your tutor"}
                  </h2>
                  <div className="space-y-4">
                    {recentCompletedClasses.map(c => (
                      <div key={c.id} className="border rounded-lg p-4 space-y-2 bg-muted/40">
                        <p className="text-xs text-muted-foreground font-medium">
                          {new Date(c.scheduledAt).toLocaleDateString(
                            language === "es" ? "es-ES" : "en-US",
                            { weekday: "short", month: "short", day: "numeric" }
                          )}
                          {" — "}{c.title}
                        </p>
                        {c.sharedNotes && (
                          <p className="text-sm text-foreground">{c.sharedNotes}</p>
                        )}
                        {c.homeworkText && (
                          <div className="mt-2 p-3 bg-accent/10 rounded-md border border-accent/20">
                            <p className="text-xs font-semibold text-accent mb-1">
                              {language === "es" ? "Tarea" : "Homework"}
                            </p>
                            <p className="text-sm text-foreground">{c.homeworkText}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Subscription Info */}
            {dashboardData?.subscription && (
              <SubscriptionCard
                subscription={dashboardData.subscription}
                onUpgrade={() => upgradePortalMutation.mutate()}
                onManage={() => customerPortalMutation.mutate()}
                isManaging={customerPortalMutation.isPending}
                isUpgrading={upgradePortalMutation.isPending}
              />
            )}

            {/* AI Practice Stats */}
            <Coachmark
              id="dashboard-ai"
              title={language === "es" ? "Practica con IA" : "AI Practice"}
              description={language === "es"
                ? "Practica español con IA entre clases. Gratis hasta 20 mensajes/día."
                : "Practice Spanish with AI between classes. Free up to 20 messages/day."}
              position="left"
              delay={2000}
            >
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-[#F59E1C] to-[#e08a0e] p-4">
                <div className="flex items-center gap-2 text-white mb-1">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="text-lg font-bold">
                    {language === 'es' ? 'Practice Partner IA' : 'AI Practice Partner'}
                  </h2>
                </div>
                <p className="text-white/80 text-xs">
                  {language === 'es' ? 'Tu progreso de práctica' : 'Your practice progress'}
                </p>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">
                      {language === 'es' ? 'Mensajes usados' : 'Messages used'}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {aiUsage?.messagesUsed ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <span className="text-sm text-foreground">
                      {language === 'es' ? 'Estado' : 'Status'}
                    </span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    aiUsage?.isSubscribed
                      ? 'bg-success/15 text-success'
                      : 'bg-accent/10 text-accent'
                  }`}>
                    {aiUsage?.isSubscribed
                      ? (language === 'es' ? 'Ilimitado' : 'Unlimited')
                      : (language === 'es'
                          ? `${aiUsage?.remaining ?? 10} gratis restantes`
                          : `${aiUsage?.remaining ?? 10} free remaining`)}
                  </span>
                </div>
                {!aiUsage?.isSubscribed && aiUsage?.limit && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#F59E1C] to-[#1C7BB1] h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(((aiUsage.messagesUsed || 0) / aiUsage.limit) * 100, 100)}%` }}
                    />
                  </div>
                )}
                <Button
                  onClick={() => setLocation("/ai-practice")}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="sm"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {language === 'es' ? 'Practicar Ahora' : 'Practice Now'}
                </Button>
              </CardContent>
            </Card>
            </Coachmark>

            {/* Achievements / Gamification */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A4A6E] to-[#1C7BB1] p-4">
                <div className="flex items-center gap-2 text-white mb-1">
                  <Trophy className="h-5 w-5" />
                  <h2 className="text-lg font-bold">
                    {language === 'es' ? 'Logros' : 'Achievements'}
                  </h2>
                </div>
                {(dashboardData?.progress?.currentStreak ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-white/90 text-sm">
                    <Flame className="h-4 w-4 text-orange-300" />
                    <span>
                      {language === 'es'
                        ? `Racha: ${dashboardData?.progress?.currentStreak} días`
                        : `Streak: ${dashboardData?.progress?.currentStreak} days`}
                    </span>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                {achievements && achievements.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {achievements.slice(0, 6).map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        title={a.description}
                      >
                        <span className="text-2xl mb-1">{a.icon}</span>
                        <span className="text-[10px] font-medium text-foreground leading-tight">{a.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Trophy className="mx-auto h-8 w-8 text-primary/30 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {language === 'es' ? 'Completa clases para desbloquear logros' : 'Complete classes to unlock achievements'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {language === 'es' ? 'Acciones Rápidas' : 'Quick Actions'}
                </h2>

                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-muted"
                    onClick={() => setLocation("/tutors")}
                  >
                    <Users className="mr-3 h-4 w-4 text-primary" />
                    {language === 'es' ? 'Ver Profesores' : 'Browse Tutors'}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-muted"
                    onClick={() => setLocation("/ai-practice")}
                  >
                    <Sparkles className="mr-3 h-4 w-4 text-accent" />
                    {language === 'es' ? 'Practice Partner IA' : 'AI Practice Partner'}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-muted"
                    onClick={() => setLocation("/packages")}
                  >
                    <BookOpen className="mr-3 h-4 w-4 text-primary" />
                    {language === 'es' ? 'Comprar Paquetes' : 'Buy Packages'}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-muted"
                    onClick={() => setLocation("/support")}
                  >
                    <LifeBuoy className="mr-3 h-4 w-4 text-primary" />
                    {language === 'es' ? 'Soporte' : 'Support'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Reschedule Dialog */}
        {rescheduleClass && (
          <RescheduleDialog
            open={!!rescheduleClass}
            onOpenChange={(open) => { if (!open) setRescheduleClass(null); }}
            classId={rescheduleClass.id}
            tutorId={rescheduleClass.tutorId}
            tutorName={rescheduleClass.tutorName || ""}
            currentDate={rescheduleClass.scheduledAt}
          />
        )}
      </main>
    </div>
  );
}
