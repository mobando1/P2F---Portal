import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  CalendarCheck,
  GraduationCap,
  Clock,
  Star,
  Video,
  Calendar,
  CheckCircle,
  Users,
  ExternalLink,
  DollarSign,
  TrendingUp,
  UserCircle,
  Link2,
  Link2Off,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";
import LevelBadge from "@/components/LevelBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface TutorDashboardData {
  tutor: {
    id: number;
    name: string;
    rating: number;
    reviewCount: number;
  };
  stats: {
    todaysClasses: number;
    upcomingClasses: number;
    completedClasses: number;
    totalHours: number;
  };
  upcomingClasses: Array<{
    id: number;
    title: string;
    scheduledAt: string;
    duration: number;
    status: string;
    meetingLink?: string;
    studentName: string;
    studentEmail: string;
  }>;
}

interface StudentInfo {
  id: number;
  name: string;
  email: string;
  level: string;
  profileImage: string | null;
  totalClasses: number;
  completedClasses: number;
  lastClassDate: string | null;
}

interface StudentProgress {
  student: { id: number; name: string; email: string; level: string };
  stats: { classesCompleted: number; learningHours: string; completedStations: number; totalStations: number; quizAvg: number; quizAttempts: number };
  advancementProgress: { toLevel: string; classes: { current: number; required: number }; stations: { current: number; required: number }; quizAvg: { current: number; required: number }; isReady: boolean } | null;
}

interface EarningsData {
  hourlyRate: number;
  totalHours: number;
  totalEarnings: number;
  totalCompleted: number;
  totalScheduled: number;
  monthly: Array<{
    month: string;
    classes: number;
    hours: number;
    earnings: number;
  }>;
}

export default function TutorDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"dashboard" | "students" | "earnings">("dashboard");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  if (user.userType !== "tutor" && user.userType !== "admin") {
    setLocation("/home");
    return null;
  }

  const { data, isLoading } = useQuery<TutorDashboardData>({
    queryKey: ["/api/tutor/dashboard"],
  });

  const { data: students } = useQuery<StudentInfo[]>({
    queryKey: ["/api/tutor/students"],
    queryFn: () => apiRequest("GET", "/api/tutor/students").then(r => r.json()),
    enabled: activeTab === "students",
  });

  const { data: earnings } = useQuery<EarningsData>({
    queryKey: ["/api/tutor/earnings"],
    queryFn: () => apiRequest("GET", "/api/tutor/earnings").then(r => r.json()),
    enabled: activeTab === "earnings",
  });

  const { data: studentProgress } = useQuery<StudentProgress>({
    queryKey: ["/api/tutor/students", selectedStudentId, "progress"],
    queryFn: () => apiRequest("GET", `/api/tutor/students/${selectedStudentId}/progress`).then(r => r.json()),
    enabled: !!selectedStudentId,
  });

  const changeLevelMutation = useMutation({
    mutationFn: async ({ studentId, level }: { studentId: number; level: string }) => {
      const response = await apiRequest("PUT", `/api/tutor/students/${studentId}/level`, { level });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/students", selectedStudentId, "progress"] });
      toast({
        title: language === "es" ? "Nivel actualizado" : "Level updated",
        description: language === "es" ? "El nivel del estudiante ha sido cambiado." : "The student's level has been changed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: language === "es" ? "No se pudo cambiar el nivel." : "Could not change the level.",
        variant: "destructive",
      });
    },
  });

  const completeClassMutation = useMutation({
    mutationFn: async (classId: number) => {
      const response = await apiRequest("PUT", `/api/tutor/classes/${classId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/classes"] });
      toast({
        title: language === "es" ? "Clase completada" : "Class completed",
        description: language === "es" ? "La clase ha sido marcada como completada." : "The class has been marked as completed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: language === "es" ? "No se pudo completar la clase." : "Could not complete the class.",
        variant: "destructive",
      });
    },
  });

  // Google Calendar connection
  const { data: googleStatus } = useQuery<{ connected: boolean; googleEmail: string | null }>({
    queryKey: ["/api/auth/google/status"],
    queryFn: () => apiRequest("GET", "/api/auth/google/status").then(r => r.json()),
  });

  const disconnectGoogleMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/google/disconnect").then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/google/status"] });
      toast({ title: language === "es" ? "Google Calendar desconectado" : "Google Calendar disconnected" });
    },
  });

  // Handle calendar connection callback
  const urlParams = new URLSearchParams(window.location.search);
  const calendarParam = urlParams.get("calendar");
  if (calendarParam === "connected") {
    toast({ title: language === "es" ? "Google Calendar conectado" : "Google Calendar connected" });
    window.history.replaceState({}, "", "/tutor-dashboard");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-1/3 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const stats = data?.stats || { todaysClasses: 0, upcomingClasses: 0, completedClasses: 0, totalHours: 0 };
  const upcomingClasses = data?.upcomingClasses || [];

  const isClassSoon = (scheduledAt: string) => {
    const classTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const diffMin = (classTime - now) / (1000 * 60);
    return diffMin <= 30 && diffMin >= -60;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#0A4A6E] mb-2">
            {language === "es" ? "Portal del Tutor" : "Tutor Portal"}
          </h1>
          <p className="text-[#0A4A6E]/70">
            {language === "es"
              ? `Bienvenido, ${data?.tutor?.name || user.firstName}. Gestiona tus clases y disponibilidad.`
              : `Welcome, ${data?.tutor?.name || user.firstName}. Manage your classes and availability.`}
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 pb-2">
          {[
            { key: "dashboard" as const, labelEs: "Panel", labelEn: "Dashboard", icon: CalendarCheck },
            { key: "students" as const, labelEs: "Mis Estudiantes", labelEn: "My Students", icon: Users },
            { key: "earnings" as const, labelEs: "Ganancias", labelEn: "Earnings", icon: DollarSign },
          ].map(tab => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              className={activeTab === tab.key ? "bg-[#1C7BB1] hover:bg-[#0A4A6E]" : "text-[#0A4A6E]/70"}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {language === "es" ? tab.labelEs : tab.labelEn}
            </Button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (<>

        {/* Stats Cards */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <motion.div variants={fadeInUp}>
            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 rounded-lg bg-[#F59E1C]/10">
                    <CalendarCheck className="h-5 w-5 md:h-6 md:w-6 text-[#F59E1C]" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-[#0A4A6E]">
                      {language === "es" ? "Clases Hoy" : "Today's Classes"}
                    </p>
                    <p className="text-xl md:text-2xl font-bold text-[#0A4A6E]">{stats.todaysClasses}</p>
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
                    <Calendar className="h-5 w-5 md:h-6 md:w-6 text-[#1C7BB1]" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-[#0A4A6E]">
                      {language === "es" ? "Programadas" : "Upcoming"}
                    </p>
                    <p className="text-xl md:text-2xl font-bold text-[#0A4A6E]">{stats.upcomingClasses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 rounded-lg bg-green-100">
                    <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-[#0A4A6E]">
                      {language === "es" ? "Completadas" : "Completed"}
                    </p>
                    <p className="text-xl md:text-2xl font-bold text-[#0A4A6E]">{stats.completedClasses}</p>
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
                    <p className="text-xs md:text-sm font-medium text-[#0A4A6E]">
                      {language === "es" ? "Horas Totales" : "Total Hours"}
                    </p>
                    <p className="text-xl md:text-2xl font-bold text-[#0A4A6E]">{stats.totalHours.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Google Calendar Connection */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${googleStatus?.connected ? "bg-green-100" : "bg-gray-100"}`}>
                  <Calendar className={`h-5 w-5 ${googleStatus?.connected ? "text-green-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A4A6E]">Google Calendar</h3>
                  {googleStatus?.connected ? (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      {language === "es" ? "Conectado como" : "Connected as"} {googleStatus.googleEmail}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      {language === "es"
                        ? "Sincroniza tus clases con tu Google Calendar"
                        : "Sync your classes with your Google Calendar"}
                    </p>
                  )}
                </div>
              </div>
              {googleStatus?.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectGoogleMutation.mutate()}
                  disabled={disconnectGoogleMutation.isPending}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Link2Off className="w-4 h-4 mr-1" />
                  {language === "es" ? "Desconectar" : "Disconnect"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => { window.location.href = "/api/auth/google/connect"; }}
                  className="bg-[#1C7BB1] hover:bg-[#0A4A6E]"
                >
                  <Link2 className="w-4 h-4 mr-1" />
                  {language === "es" ? "Conectar" : "Connect"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — Upcoming Classes */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-[#0A4A6E] mb-4">
                  {language === "es" ? "Próximas Clases" : "Upcoming Classes"}
                </h2>

                {upcomingClasses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#EAF4FA] rounded-full mx-auto mb-4 flex items-center justify-center">
                      <CalendarCheck className="w-8 h-8 text-[#1C7BB1]" />
                    </div>
                    <p className="text-[#0A4A6E]/60">
                      {language === "es" ? "No tienes clases programadas" : "No upcoming classes scheduled"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingClasses.map((classItem) => {
                      const soon = isClassSoon(classItem.scheduledAt);
                      return (
                        <motion.div
                          key={classItem.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors ${
                            soon
                              ? "border-green-300 bg-green-50/50"
                              : "border-[#1C7BB1]/20 hover:bg-[#EAF4FA]/30"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            soon ? "bg-green-100" : "bg-[#1C7BB1]/10"
                          }`}>
                            <GraduationCap className={`h-5 w-5 ${soon ? "text-green-600" : "text-[#1C7BB1]"}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-[#0A4A6E] truncate">{classItem.title}</h4>
                              {soon && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  {language === "es" ? "Ahora" : "Now"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-[#0A4A6E]/70 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {classItem.studentName}
                            </p>
                            <p className="text-sm text-[#0A4A6E]/50">
                              {new Date(classItem.scheduledAt).toLocaleDateString(
                                language === "es" ? "es-ES" : "en-US",
                                { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
                              )}
                              {" · "}
                              {classItem.duration} min
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {classItem.meetingLink && soon && (
                              <a
                                href={classItem.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                  <Video className="h-4 w-4 mr-1" />
                                  {language === "es" ? "Unirse" : "Join"}
                                </Button>
                              </a>
                            )}
                            {classItem.meetingLink && !soon && (
                              <a
                                href={classItem.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#1C7BB1] hover:underline"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => completeClassMutation.mutate(classItem.id)}
                              disabled={completeClassMutation.isPending}
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {language === "es" ? "Completar" : "Complete"}
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — Sidebar */}
          <div className="space-y-6">
            {/* Tutor Rating */}
            {data?.tutor && (
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] p-4">
                  <h2 className="text-lg font-bold text-white">
                    {language === "es" ? "Tu Perfil" : "Your Profile"}
                  </h2>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-[#F59E1C]" />
                      <span className="text-sm text-[#0A4A6E]">
                        {language === "es" ? "Calificación" : "Rating"}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#0A4A6E]">
                      {data.tutor.rating?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#1C7BB1]" />
                      <span className="text-sm text-[#0A4A6E]">
                        {language === "es" ? "Reseñas" : "Reviews"}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#0A4A6E]">{data.tutor.reviewCount || 0}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-[#0A4A6E] mb-4">
                  {language === "es" ? "Acciones" : "Actions"}
                </h2>
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-[#EAF4FA]"
                    onClick={() => setLocation("/tutor-portal/availability")}
                  >
                    <Calendar className="mr-3 h-4 w-4 text-[#1C7BB1]" />
                    {language === "es" ? "Gestionar Disponibilidad" : "Manage Availability"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-[#EAF4FA]"
                    onClick={() => setLocation("/tutor-portal/classes")}
                  >
                    <GraduationCap className="mr-3 h-4 w-4 text-[#F59E1C]" />
                    {language === "es" ? "Historial de Clases" : "Class History"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        </>)}

        {/* Students Tab */}
        {activeTab === "students" && (
          <>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-[#0A4A6E] mb-4">
                {language === "es" ? "Mis Estudiantes" : "My Students"}
              </h2>
              {!students || students.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#EAF4FA] rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-8 h-8 text-[#1C7BB1]" />
                  </div>
                  <p className="text-[#0A4A6E]/60">
                    {language === "es" ? "Aún no tienes estudiantes" : "No students yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map(student => (
                    <div
                      key={student.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-[#1C7BB1]/10 hover:bg-[#EAF4FA]/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {student.profileImage ? (
                          <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="h-6 w-6 text-[#1C7BB1]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-[#0A4A6E] truncate">{student.name}</h4>
                          <LevelBadge level={student.level} size="sm" />
                        </div>
                        <p className="text-xs text-[#0A4A6E]/50">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#0A4A6E]/70">
                        <div className="text-center">
                          <p className="font-bold text-[#0A4A6E]">{student.completedClasses}</p>
                          <p className="text-[10px]">{language === "es" ? "Completadas" : "Completed"}</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-[#0A4A6E]">{student.totalClasses}</p>
                          <p className="text-[10px]">{language === "es" ? "Total" : "Total"}</p>
                        </div>
                        {student.lastClassDate && (
                          <div className="text-center hidden sm:block">
                            <p className="text-xs">
                              {new Date(student.lastClassDate).toLocaleDateString(
                                language === "es" ? "es-ES" : "en-US",
                                { month: "short", day: "numeric" }
                              )}
                            </p>
                            <p className="text-[10px]">{language === "es" ? "Última" : "Last"}</p>
                          </div>
                        )}
                        <ArrowUpRight className="h-4 w-4 text-[#1C7BB1]/40" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Detail Dialog */}
          <Dialog open={selectedStudentId !== null} onOpenChange={() => setSelectedStudentId(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#1C7BB1]" />
                  {language === "es" ? "Progreso del Estudiante" : "Student Progress"}
                </DialogTitle>
              </DialogHeader>

              {studentProgress ? (
                <div className="space-y-5 mt-2">
                  {/* Student Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-[#1C7BB1]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0A4A6E]">{studentProgress.student.name}</h3>
                      <p className="text-xs text-muted-foreground">{studentProgress.student.email}</p>
                    </div>
                  </div>

                  {/* Level Selector */}
                  <div className="flex items-center justify-between p-3 bg-[#EAF4FA] rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-[#0A4A6E]">
                        {language === "es" ? "Nivel actual" : "Current level"}
                      </p>
                    </div>
                    <Select
                      value={studentProgress.student.level}
                      onValueChange={(val) => {
                        if (selectedStudentId) {
                          changeLevelMutation.mutate({ studentId: selectedStudentId, level: val });
                        }
                      }}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A2">A2</SelectItem>
                        <SelectItem value="B1">B1</SelectItem>
                        <SelectItem value="B2">B2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-[#0A4A6E]">{studentProgress.stats.classesCompleted}</p>
                      <p className="text-[10px] text-muted-foreground">{language === "es" ? "Clases" : "Classes"}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-[#0A4A6E]">{studentProgress.stats.completedStations}/{studentProgress.stats.totalStations}</p>
                      <p className="text-[10px] text-muted-foreground">{language === "es" ? "Estaciones" : "Stations"}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-[#0A4A6E]">{studentProgress.stats.quizAvg}%</p>
                      <p className="text-[10px] text-muted-foreground">{language === "es" ? "Prom. Quiz" : "Quiz Avg"}</p>
                    </div>
                  </div>

                  {/* Advancement Progress */}
                  {studentProgress.advancementProgress && (
                    <div className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#0A4A6E]">
                          {language === "es" ? "Progreso hacia" : "Progress to"} {studentProgress.advancementProgress.toLevel}
                        </p>
                        {studentProgress.advancementProgress.isReady && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            {language === "es" ? "Listo" : "Ready"}
                          </Badge>
                        )}
                      </div>

                      {/* Classes */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{language === "es" ? "Clases" : "Classes"}</span>
                          <span className="font-medium">{studentProgress.advancementProgress.classes.current}/{studentProgress.advancementProgress.classes.required}</span>
                        </div>
                        <Progress value={Math.min(100, (studentProgress.advancementProgress.classes.current / studentProgress.advancementProgress.classes.required) * 100)} className="h-2" />
                      </div>

                      {/* Stations */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{language === "es" ? "Estaciones" : "Stations"}</span>
                          <span className="font-medium">{studentProgress.advancementProgress.stations.current}/{studentProgress.advancementProgress.stations.required}</span>
                        </div>
                        <Progress value={Math.min(100, (studentProgress.advancementProgress.stations.current / studentProgress.advancementProgress.stations.required) * 100)} className="h-2" />
                      </div>

                      {/* Quiz Average */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{language === "es" ? "Prom. Quiz" : "Quiz Avg"}</span>
                          <span className="font-medium">{studentProgress.advancementProgress.quizAvg.current}% / {studentProgress.advancementProgress.quizAvg.required}%</span>
                        </div>
                        <Progress value={Math.min(100, (studentProgress.advancementProgress.quizAvg.current / studentProgress.advancementProgress.quizAvg.required) * 100)} className="h-2" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]" />
                </div>
              )}
            </DialogContent>
          </Dialog>
          </>
        )}

        {/* Earnings Tab */}
        {activeTab === "earnings" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-[#0A4A6E]/60">{language === "es" ? "Total Ganado" : "Total Earned"}</p>
                      <p className="text-xl font-bold text-[#0A4A6E]">${earnings?.totalEarnings?.toFixed(2) || "0.00"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#1C7BB1]/10">
                      <Clock className="h-5 w-5 text-[#1C7BB1]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#0A4A6E]/60">{language === "es" ? "Horas Totales" : "Total Hours"}</p>
                      <p className="text-xl font-bold text-[#0A4A6E]">{earnings?.totalHours || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#F59E1C]/10">
                      <TrendingUp className="h-5 w-5 text-[#F59E1C]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#0A4A6E]/60">{language === "es" ? "Tarifa/Hora" : "Hourly Rate"}</p>
                      <p className="text-xl font-bold text-[#0A4A6E]">${earnings?.hourlyRate || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-[#0A4A6E]/60">{language === "es" ? "Completadas" : "Completed"}</p>
                      <p className="text-xl font-bold text-[#0A4A6E]">{earnings?.totalCompleted || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Breakdown */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-[#0A4A6E] mb-4">
                  {language === "es" ? "Desglose Mensual" : "Monthly Breakdown"}
                </h2>
                {earnings?.monthly && earnings.monthly.length > 0 ? (
                  <div className="space-y-3">
                    {earnings.monthly.map(m => {
                      const maxEarnings = Math.max(...earnings.monthly.map(e => e.earnings), 1);
                      const pct = (m.earnings / maxEarnings) * 100;
                      const [year, month] = m.month.split("-");
                      const monthDate = new Date(parseInt(year), parseInt(month) - 1);
                      return (
                        <div key={m.month} className="flex items-center gap-4">
                          <span className="text-sm text-[#0A4A6E]/70 w-20 flex-shrink-0">
                            {monthDate.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "short", year: "2-digit" })}
                          </span>
                          <div className="flex-1">
                            <div className="h-7 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] rounded-full flex items-center justify-end pr-2 transition-all"
                                style={{ width: `${Math.max(pct, 8)}%` }}
                              >
                                {pct > 20 && (
                                  <span className="text-[10px] text-white font-medium">${m.earnings}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right w-24 flex-shrink-0">
                            <span className="text-sm font-semibold text-[#0A4A6E]">${m.earnings}</span>
                            <span className="text-xs text-[#0A4A6E]/50 ml-1">({m.classes} {language === "es" ? "cls" : "cls"})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[#0A4A6E]/50 text-center py-8">
                    {language === "es" ? "Sin datos de ganancias aún" : "No earnings data yet"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
