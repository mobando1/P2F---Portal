import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import SubscriptionCard from "@/components/subscription-card";
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
  X,
  Sparkles,
  MessageCircle,
  TrendingUp
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

  // Redirect if not authenticated
  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  // Queries
  const { data: dashboardData, isLoading: isDashboardLoading, isError: isDashboardError, error: dashboardError } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", user.id],
  });

  const { data: aiUsage } = useQuery<{
    messagesUsed: number;
    remaining: number;
    isSubscribed: boolean;
    limit: number | null;
  }>({
    queryKey: ["/api/ai/usage"],
  });

  // Handle query errors
  if (isDashboardError) {
    console.error('Dashboard query failed:', dashboardError);
    toast({
      title: "Error de sesión",
      description: "Recargando tu sesión...",
      variant: "destructive",
    });
    queryClient.clear();
    localStorage.removeItem('passport2fluency_user');
    setLocation("/login");
    return null;
  }

  // Mutations
  const cancelClassMutation = useMutation({
    mutationFn: async (classId: number) => {
      const response = await apiRequest("PUT", `/api/classes/${classId}/cancel`, {
        userId: user.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes", user.id] });
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
        userId: user.id,
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
        userId: user.id,
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

  const handleCancelClass = (classId: number) => {
    cancelClassMutation.mutate(classId);
  };

  if (isDashboardLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#0A4A6E] mb-2">
            {t.welcomeName} <span className="text-[#1C7BB1]">{dashboardData?.user?.firstName || user.firstName}</span>!
          </h1>
          <p className="text-[#0A4A6E]/70">{t.continueJourney}</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-8">
          <motion.div variants={fadeInUp}>
            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 rounded-lg bg-[#1C7BB1]/10">
                    <CalendarCheck className="h-5 w-5 md:h-6 md:w-6 text-[#1C7BB1]" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-[#0A4A6E]">{t.classesBooked}</p>
                    <p className="text-xl md:text-2xl font-bold text-[#0A4A6E]">{stats.classesBooked}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 rounded-lg bg-[#F59E1C]/10">
                    <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-[#F59E1C]" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-[#0A4A6E]">{t.classesCompleted}</p>
                    <p className="text-xl md:text-2xl font-bold text-[#0A4A6E]">{stats.classesCompleted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 rounded-lg bg-[#1C7BB1]/10">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-[#1C7BB1]" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-[#0A4A6E]">{t.learningHours}</p>
                    <p className="text-xl md:text-2xl font-bold text-[#0A4A6E]">{stats.learningHours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 rounded-lg bg-[#F59E1C]/10">
                    <Star className="h-5 w-5 md:h-6 md:w-6 text-[#F59E1C]" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-[#0A4A6E]">{t.currentLevel}</p>
                    <p className="text-xl md:text-2xl font-bold text-[#0A4A6E]">{stats.currentLevel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="col-span-2 md:col-span-1">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] text-white h-full">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-white/90">
                      {language === 'es' ? 'Clases Restantes' : 'Remaining Classes'}
                    </p>
                    <p className="text-xl md:text-2xl font-bold text-white">{stats.remainingClasses}</p>
                  </div>
                  <Button
                    onClick={() => setLocation("/packages")}
                    size="sm"
                    className="bg-white text-[#1C7BB1] hover:bg-white/90 font-medium"
                  >
                    {language === 'es' ? 'Comprar Más' : 'Buy More'}
                  </Button>
                </div>
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
                <h2 className="text-xl font-semibold text-[#0A4A6E] mb-4">{t.upcomingClasses}</h2>

                <div className="space-y-4">
                  {upcomingClasses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-[#EAF4FA] rounded-full mx-auto mb-4 flex items-center justify-center">
                        <CalendarCheck className="w-8 h-8 text-[#1C7BB1]" />
                      </div>
                      <p className="text-[#0A4A6E]/60 mb-2">{t.noUpcomingClasses}</p>
                      <p className="text-[#0A4A6E]/40 text-sm mb-4">
                        {t.reserveFirstClass}
                      </p>
                      <Button
                        onClick={() => setLocation("/tutors")}
                        className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
                      >
                        {t.exploreTutors}
                      </Button>
                    </div>
                  ) : (
                    upcomingClasses.map((classItem: any) => (
                      <div key={classItem.id} className="flex items-center space-x-4 p-4 border border-[#1C7BB1]/20 rounded-lg hover:bg-[#EAF4FA]/30 transition-colors">
                        <div className="w-12 h-12 bg-[#1C7BB1]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="text-[#1C7BB1] h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#0A4A6E] truncate">{classItem.title}</h4>
                          <p className="text-sm text-[#0A4A6E]/70">{language === 'es' ? 'Con' : 'With'} {classItem.tutorName}</p>
                          <p className="text-sm text-[#0A4A6E]/50">
                            {new Date(classItem.scheduledAt).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {classItem.meetingLink && (
                          <a
                            href={classItem.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[#1C7BB1] hover:underline flex-shrink-0"
                          >
                            {language === 'es' ? 'Unirse' : 'Join'}
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelClass(classItem.id)}
                          className="text-[#0A4A6E]/40 hover:text-red-500 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
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
                    <MessageCircle className="h-4 w-4 text-[#1C7BB1]" />
                    <span className="text-sm text-[#0A4A6E]">
                      {language === 'es' ? 'Mensajes usados' : 'Messages used'}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#0A4A6E]">
                    {aiUsage?.messagesUsed ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#F59E1C]" />
                    <span className="text-sm text-[#0A4A6E]">
                      {language === 'es' ? 'Estado' : 'Status'}
                    </span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    aiUsage?.isSubscribed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-[#F59E1C]/10 text-[#F59E1C]'
                  }`}>
                    {aiUsage?.isSubscribed
                      ? (language === 'es' ? 'Ilimitado' : 'Unlimited')
                      : (language === 'es'
                          ? `${aiUsage?.remaining ?? 10} gratis restantes`
                          : `${aiUsage?.remaining ?? 10} free remaining`)}
                  </span>
                </div>
                {!aiUsage?.isSubscribed && aiUsage?.limit && (
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#F59E1C] to-[#1C7BB1] h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(((aiUsage.messagesUsed || 0) / aiUsage.limit) * 100, 100)}%` }}
                    />
                  </div>
                )}
                <Button
                  onClick={() => setLocation("/ai-practice")}
                  className="w-full bg-[#F59E1C] hover:bg-[#e08a0e] text-white"
                  size="sm"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {language === 'es' ? 'Practicar Ahora' : 'Practice Now'}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-[#0A4A6E] mb-4">
                  {language === 'es' ? 'Acciones Rápidas' : 'Quick Actions'}
                </h2>

                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-[#EAF4FA]"
                    onClick={() => setLocation("/tutors")}
                  >
                    <Users className="mr-3 h-4 w-4 text-[#1C7BB1]" />
                    {language === 'es' ? 'Ver Profesores' : 'Browse Tutors'}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-[#EAF4FA]"
                    onClick={() => setLocation("/ai-practice")}
                  >
                    <Sparkles className="mr-3 h-4 w-4 text-[#F59E1C]" />
                    {language === 'es' ? 'Practice Partner IA' : 'AI Practice Partner'}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-[#EAF4FA]"
                    onClick={() => setLocation("/packages")}
                  >
                    <BookOpen className="mr-3 h-4 w-4 text-[#1C7BB1]" />
                    {language === 'es' ? 'Comprar Paquetes' : 'Buy Packages'}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-[#EAF4FA]"
                    onClick={() => setLocation("/contact")}
                  >
                    <Headphones className="mr-3 h-4 w-4 text-[#1C7BB1]" />
                    {language === 'es' ? 'Contactar Soporte' : 'Contact Support'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
