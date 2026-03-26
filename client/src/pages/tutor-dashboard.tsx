import { useState, useEffect } from "react";
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
  User,
  Upload,
  Save,
  BookOpen,
  History,
  MessageCircle,
  FileText,
} from "lucide-react";
import LevelBadge from "@/components/LevelBadge";
import StudentProfileDrawer from "@/components/StudentProfileDrawer";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
    classesWithoutNotes: number;
    pendingAssignments: number;
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

interface TutorProfile {
  id: number;
  name: string;
  email: string;
  bio: string | null;
  avatar: string | null;
  profileImage: string | null;
  phone: string | null;
  languages: string[] | null;
  certifications: string[] | null;
  yearsOfExperience: number | null;
  rating: string | null;
  reviewCount: number;
  hourlyRate: string | null;
}

export default function TutorDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"today" | "schedule" | "students" | "profile">("today");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [drawerStudentId, setDrawerStudentId] = useState<number | null>(null);
  const [notesModal, setNotesModal] = useState<{ classId: number; studentName: string } | null>(null);
  const [sessionNotes, setSessionNotes] = useState("");
  const [sharedNotes, setSharedNotes] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [scheduleView, setScheduleView] = useState<"upcoming" | "history">("upcoming");
  const [studentSearch, setStudentSearch] = useState("");

  // Profile editing state
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCerts, setEditCerts] = useState("");
  const [editLangs, setEditLangs] = useState("");
  const [editYears, setEditYears] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const isAuthed = isAuthenticated() && !!user;
  const isTutorOrAdmin = isAuthed && (user?.userType === "tutor" || user?.userType === "admin");

  // ALL hooks must be called before any conditional returns (React rules of hooks)
  const { data, isLoading } = useQuery<TutorDashboardData>({
    queryKey: ["/api/tutor/dashboard"],
    enabled: isTutorOrAdmin,
  });

  const { data: students } = useQuery<StudentInfo[]>({
    queryKey: ["/api/tutor/students"],
    queryFn: () => apiRequest("GET", "/api/tutor/students").then(r => r.json()),
    enabled: isTutorOrAdmin && activeTab === "students",
  });

  const { data: earnings } = useQuery<EarningsData>({
    queryKey: ["/api/tutor/earnings"],
    queryFn: () => apiRequest("GET", "/api/tutor/earnings").then(r => r.json()),
    enabled: isTutorOrAdmin && activeTab === "schedule",
  });

  const { data: tutorPayments } = useQuery<Array<{
    id: number; amount: string; currency: string; periodStart: string; periodEnd: string;
    classesCount: number; hoursWorked: string; status: string; paymentMethod: string | null;
    receiptUrl: string | null; paidAt: string | null; createdAt: string;
  }>>({
    queryKey: ["/api/tutor/payments"],
    queryFn: () => apiRequest("GET", "/api/tutor/payments").then(r => r.json()),
    enabled: isTutorOrAdmin && activeTab === "schedule",
  });

  const { data: allClasses } = useQuery<Array<{
    id: number; title: string; scheduledAt: string; duration: number; status: string;
    meetingLink?: string; studentName?: string; userId: number;
    sessionNotes?: string; sharedNotes?: string; homeworkText?: string;
  }>>({
    queryKey: ["/api/tutor/classes"],
    queryFn: () => apiRequest("GET", "/api/tutor/classes").then(r => r.json()),
    enabled: isTutorOrAdmin && activeTab === "schedule",
  });

  const { data: prepCards } = useQuery<Array<{
    classId: number;
    scheduledAt: string;
    duration: number;
    meetingLink?: string;
    student: { id: number; name: string; level: string };
    currentStation: { title: string; level: string; order: number } | null;
    lastClass: { scheduledAt: string; sessionNotes: string | null; sharedNotes: string | null; homeworkText: string | null } | null;
    aiThisWeek: number;
    pendingAssignments: number;
  }>>({
    queryKey: ["/api/tutor/prep"],
    queryFn: () => apiRequest("GET", "/api/tutor/prep").then(r => r.json()),
    enabled: isTutorOrAdmin && activeTab === "today",
  });

  const { data: tutorProfileData } = useQuery({
    queryKey: ["/api/tutor/profile"],
    queryFn: () => apiRequest("GET", "/api/tutor/profile").then(r => r.json()),
    enabled: isTutorOrAdmin && activeTab === "profile",
  });
  const tutorProfile = tutorProfileData as TutorProfile | undefined;

  // Populate profile form when data loads
  useEffect(() => {
    if (tutorProfile && !profileLoaded) {
      setEditBio(tutorProfile.bio || "");
      setEditPhone(tutorProfile.phone || "");
      setEditCerts(tutorProfile.certifications?.join(", ") || "");
      setEditLangs(tutorProfile.languages?.join(", ") || "");
      setEditYears(tutorProfile.yearsOfExperience?.toString() || "");
      setEditAvatar(tutorProfile.avatar || tutorProfile.profileImage || null);
      setProfileLoaded(true);
    }
  }, [tutorProfile, profileLoaded]);

  const { data: studentProgress } = useQuery<StudentProgress>({
    queryKey: ["/api/tutor/students", selectedStudentId, "progress"],
    queryFn: () => apiRequest("GET", `/api/tutor/students/${selectedStudentId}/progress`).then(r => r.json()),
    enabled: isTutorOrAdmin && !!selectedStudentId,
  });

  // Conditional redirects AFTER all hooks
  if (!isAuthed) {
    setLocation("/login");
    return null;
  }

  if (!isTutorOrAdmin) {
    setLocation("/home");
    return null;
  }

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
      toast({ title: "Error", description: language === "es" ? "No se pudo cambiar el nivel." : "Could not change the level.", variant: "destructive" });
    },
  });

  const completeClassMutation = useMutation({
    mutationFn: async ({ classId, sessionNotes: sn, sharedNotes: sh, homeworkText: hw }: { classId: number; sessionNotes?: string; sharedNotes?: string; homeworkText?: string }) => {
      const response = await apiRequest("PUT", `/api/tutor/classes/${classId}/complete`, { sessionNotes: sn, sharedNotes: sh, homeworkText: hw });
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
      toast({ title: "Error", description: language === "es" ? "No se pudo completar la clase." : "Could not complete the class.", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Record<string, unknown>) => {
      const response = await apiRequest("PUT", "/api/tutor/profile", profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/dashboard"] });
      toast({ title: language === "es" ? "Perfil actualizado" : "Profile updated" });
    },
    onError: () => {
      toast({ title: "Error", description: language === "es" ? "No se pudo actualizar el perfil." : "Could not update profile.", variant: "destructive" });
    },
  });

  // Google Calendar
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
    window.history.replaceState({}, "", "/tutor-portal");
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

  const stats: TutorDashboardData['stats'] = data?.stats as TutorDashboardData['stats'] || { todaysClasses: 0, upcomingClasses: 0, completedClasses: 0, totalHours: 0, classesWithoutNotes: 0, pendingAssignments: 0 };
  const upcomingClasses = data?.upcomingClasses || [];

  const isClassSoon = (scheduledAt: string) => {
    const classTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const diffMin = (classTime - now) / (1000 * 60);
    return diffMin <= 30 && diffMin >= -60;
  };

  const todaysClasses = upcomingClasses.filter(c => {
    const d = new Date(c.scheduledAt);
    return d.toDateString() === new Date().toDateString();
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleProfileSave = () => {
    updateProfileMutation.mutate({
      bio: editBio,
      phone: editPhone,
      certifications: editCerts.split(",").map(s => s.trim()).filter(Boolean),
      languages: editLangs.split(",").map(s => s.trim()).filter(Boolean),
      yearsOfExperience: editYears ? parseInt(editYears) : null,
      avatar: editAvatar,
    });
  };

  const filteredStudents = students?.filter(s => {
    if (!studentSearch) return true;
    const term = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term);
  });

  const isEs = language === "es";
  const todayStr = new Date().toLocaleDateString(isEs ? "es-ES" : "en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0A4A6E]">
            {isEs ? "Hola" : "Hi"}, {data?.tutor?.name || user.firstName}
          </h1>
          <p className="text-sm text-[#0A4A6E]/60 capitalize">{todayStr}</p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100 overflow-x-auto">
          {[
            { key: "today" as const, labelEs: "Hoy", labelEn: "Today", icon: CalendarCheck },
            { key: "schedule" as const, labelEs: "Agenda", labelEn: "Schedule", icon: Calendar },
            { key: "students" as const, labelEs: "Estudiantes", labelEn: "Students", icon: Users },
            { key: "profile" as const, labelEs: "Perfil", labelEn: "Profile", icon: User },
          ].map(tab => (
            <Button
              key={tab.key}
              variant="ghost"
              size="sm"
              className={`flex-1 min-w-0 rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-[#1C7BB1] text-white hover:bg-[#0A4A6E] shadow-sm"
                  : "text-[#0A4A6E]/60 hover:text-[#0A4A6E] hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="truncate text-xs sm:text-sm">{isEs ? tab.labelEs : tab.labelEn}</span>
            </Button>
          ))}
        </div>

        {/* ═══════════════ TODAY TAB ═══════════════ */}
        {activeTab === "today" && (
          <div className="space-y-6">
            {/* Stats Row */}
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: isEs ? "Hoy" : "Today", value: stats.todaysClasses, icon: CalendarCheck, color: "text-[#F59E1C]", bg: "bg-[#F59E1C]/10" },
                { label: isEs ? "Programadas" : "Upcoming", value: stats.upcomingClasses, icon: Calendar, color: "text-[#1C7BB1]", bg: "bg-[#1C7BB1]/10" },
                { label: isEs ? "Completadas" : "Completed", value: stats.completedClasses, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
                { label: isEs ? "Horas" : "Hours", value: stats.totalHours.toFixed(0), icon: Clock, color: "text-[#1C7BB1]", bg: "bg-[#1C7BB1]/10" },
              ].map((s, i) => (
                <motion.div key={i} variants={fadeInUp}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${s.bg}`}>
                          <s.icon className={`h-4 w-4 md:h-5 md:w-5 ${s.color}`} />
                        </div>
                        <div>
                          <p className="text-[10px] md:text-xs text-[#0A4A6E]/60">{s.label}</p>
                          <p className="text-lg md:text-xl font-bold text-[#0A4A6E]">{s.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Alerts */}
            {(stats.classesWithoutNotes > 0 || stats.pendingAssignments > 0) && (
              <div className="flex flex-wrap gap-2">
                {stats.classesWithoutNotes > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    <Star className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    <strong>{stats.classesWithoutNotes}</strong> {isEs ? "clases sin notas" : "classes without notes"}
                  </div>
                )}
                {stats.pendingAssignments > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <strong>{stats.pendingAssignments}</strong> {isEs ? "tareas pendientes" : "pending tasks"}
                  </div>
                )}
              </div>
            )}

            {/* Today's Classes */}
            <div>
              <h2 className="text-base font-semibold text-[#0A4A6E] mb-3">
                {isEs ? "Clases de hoy" : "Today's classes"}
                {todaysClasses.length > 0 && <Badge className="ml-2 bg-[#F59E1C] text-white">{todaysClasses.length}</Badge>}
              </h2>
              {todaysClasses.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <div className="w-14 h-14 bg-[#EAF4FA] rounded-full mx-auto mb-3 flex items-center justify-center">
                      <CalendarCheck className="w-7 h-7 text-[#1C7BB1]" />
                    </div>
                    <p className="text-sm text-[#0A4A6E]/60">
                      {isEs ? "No tienes clases hoy. Disfruta tu tiempo libre." : "No classes today. Enjoy your free time."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {todaysClasses.map(c => {
                    const soon = isClassSoon(c.scheduledAt);
                    return (
                      <Card key={c.id} className={`border-0 shadow-sm ${soon ? "ring-2 ring-green-400 bg-green-50/30" : ""}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${soon ? "bg-green-100" : "bg-[#EAF4FA]"}`}>
                            <Video className={`h-5 w-5 ${soon ? "text-green-600" : "text-[#1C7BB1]"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-[#0A4A6E] truncate">{c.studentName}</h4>
                              {soon && <Badge className="bg-green-100 text-green-700 text-[10px]">{isEs ? "Ahora" : "Now"}</Badge>}
                            </div>
                            <p className="text-xs text-[#0A4A6E]/60">
                              {new Date(c.scheduledAt).toLocaleTimeString(isEs ? "es-ES" : "en-US", { hour: "numeric", minute: "2-digit" })}
                              {" · "}{c.duration} min
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {c.meetingLink && (
                              <a href={c.meetingLink} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className={soon ? "bg-green-600 hover:bg-green-700" : "bg-[#1C7BB1] hover:bg-[#0A4A6E]"}>
                                  <Video className="h-4 w-4 mr-1" />
                                  {isEs ? "Unirse" : "Join"}
                                </Button>
                              </a>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSessionNotes(""); setSharedNotes(""); setHomeworkText("");
                                setNotesModal({ classId: c.id, studentName: c.studentName });
                              }}
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prep Cards — next 48h */}
            {prepCards && prepCards.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-[#0A4A6E] mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#F59E1C]" />
                  {isEs ? "Preparar clases" : "Class prep"} <span className="text-xs font-normal text-[#0A4A6E]/50">({isEs ? "próximas 48h" : "next 48h"})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prepCards.map(card => (
                    <Card key={card.classId} className="border-l-4 border-l-[#1C7BB1] border-0 shadow-sm">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-[#0A4A6E]">
                              {new Date(card.scheduledAt).toLocaleDateString(isEs ? "es-ES" : "en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </p>
                            <p className="text-xs text-[#0A4A6E]/60">{card.duration} min · {card.student.name}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <LevelBadge level={card.student.level} size="sm" />
                            <button className="p-1 rounded hover:bg-[#EAF4FA]" onClick={() => setDrawerStudentId(card.student.id)}>
                              <ArrowUpRight className="h-3.5 w-3.5 text-[#1C7BB1]" />
                            </button>
                          </div>
                        </div>

                        {card.currentStation && (
                          <div className="p-2 bg-[#EAF4FA]/60 rounded-md">
                            <p className="text-[10px] text-[#1C7BB1] font-semibold uppercase">{isEs ? "Estación actual" : "Current station"}</p>
                            <p className="text-xs text-[#0A4A6E] font-medium">{card.currentStation.title}</p>
                          </div>
                        )}

                        {card.lastClass && (card.lastClass.sessionNotes || card.lastClass.homeworkText) && (
                          <div className="space-y-1.5">
                            {card.lastClass.sessionNotes && (
                              <div className="p-2 bg-gray-50 rounded-md border border-dashed border-gray-200">
                                <p className="text-[10px] text-gray-400 font-semibold uppercase">{isEs ? "Última nota" : "Last note"}</p>
                                <p className="text-xs text-gray-600 line-clamp-2">{card.lastClass.sessionNotes}</p>
                              </div>
                            )}
                            {card.lastClass.homeworkText && (
                              <div className="p-2 bg-amber-50 rounded-md border-l-2 border-[#F59E1C]">
                                <p className="text-[10px] text-[#F59E1C] font-semibold uppercase">{isEs ? "Tarea" : "Homework"}</p>
                                <p className="text-xs text-amber-800 line-clamp-2">{card.lastClass.homeworkText}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <div className="flex items-center gap-3 text-[10px] text-[#0A4A6E]/60">
                            {card.aiThisWeek > 0 && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3 text-orange-400" /> {card.aiThisWeek} IA
                              </span>
                            )}
                            {card.pendingAssignments > 0 && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Star className="h-3 w-3" /> {card.pendingAssignments} {isEs ? "tarea(s)" : "task(s)"}
                              </span>
                            )}
                          </div>
                          {card.meetingLink && (
                            <a href={card.meetingLink} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="h-6 text-[10px] bg-green-600 hover:bg-green-700 text-white px-2">
                                <Video className="h-3 w-3 mr-1" /> Join
                              </Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ SCHEDULE TAB ═══════════════ */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {/* Toggle */}
            <div className="flex gap-2">
              <Button
                variant={scheduleView === "upcoming" ? "default" : "outline"}
                size="sm"
                className={scheduleView === "upcoming" ? "bg-[#1C7BB1] hover:bg-[#0A4A6E]" : ""}
                onClick={() => setScheduleView("upcoming")}
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                {isEs ? "Próximas" : "Upcoming"}
              </Button>
              <Button
                variant={scheduleView === "history" ? "default" : "outline"}
                size="sm"
                className={scheduleView === "history" ? "bg-[#1C7BB1] hover:bg-[#0A4A6E]" : ""}
                onClick={() => setScheduleView("history")}
              >
                <History className="h-4 w-4 mr-1.5" />
                {isEs ? "Historial" : "History"}
              </Button>
            </div>

            {/* Earnings Summary (compact) */}
            {earnings && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-green-600">${earnings.totalEarnings?.toFixed(0) || 0}</p>
                    <p className="text-[10px] text-[#0A4A6E]/60">{isEs ? "Total Ganado" : "Total Earned"}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-[#1C7BB1]">{earnings.totalHours || 0}h</p>
                    <p className="text-[10px] text-[#0A4A6E]/60">{isEs ? "Horas" : "Hours"}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-[#F59E1C]">${earnings.hourlyRate || 0}/h</p>
                    <p className="text-[10px] text-[#0A4A6E]/60">{isEs ? "Tarifa" : "Rate"}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Classes List */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 md:p-6">
                <h2 className="text-base font-semibold text-[#0A4A6E] mb-4">
                  {scheduleView === "upcoming"
                    ? (isEs ? "Próximas Clases" : "Upcoming Classes")
                    : (isEs ? "Historial de Clases" : "Class History")}
                </h2>

                {scheduleView === "upcoming" ? (
                  upcomingClasses.length === 0 ? (
                    <div className="text-center py-10">
                      <Calendar className="w-10 h-10 text-[#1C7BB1]/30 mx-auto mb-3" />
                      <p className="text-sm text-[#0A4A6E]/50">{isEs ? "No tienes clases programadas" : "No upcoming classes"}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingClasses.map(c => {
                        const soon = isClassSoon(c.scheduledAt);
                        return (
                          <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${soon ? "border-green-300 bg-green-50/50" : "border-gray-100 hover:bg-gray-50"}`}>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${soon ? "bg-green-100" : "bg-[#EAF4FA]"}`}>
                              <GraduationCap className={`h-4 w-4 ${soon ? "text-green-600" : "text-[#1C7BB1]"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-[#0A4A6E] truncate">{c.studentName}</h4>
                                {soon && <Badge className="bg-green-100 text-green-700 text-[10px]">{isEs ? "Ahora" : "Now"}</Badge>}
                              </div>
                              <p className="text-xs text-[#0A4A6E]/50">
                                {new Date(c.scheduledAt).toLocaleDateString(isEs ? "es-ES" : "en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                {" · "}{c.duration} min
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {c.meetingLink && soon && (
                                <a href={c.meetingLink} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8">
                                    <Video className="h-3.5 w-3.5 mr-1" /> {isEs ? "Unirse" : "Join"}
                                  </Button>
                                </a>
                              )}
                              {c.meetingLink && !soon && (
                                <a href={c.meetingLink} target="_blank" rel="noopener noreferrer" className="text-[#1C7BB1]">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              <Button variant="outline" size="sm" className="h-8 text-green-600 border-green-200" onClick={() => {
                                setSessionNotes(""); setSharedNotes(""); setHomeworkText("");
                                setNotesModal({ classId: c.id, studentName: c.studentName });
                              }}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* History view */
                  (() => {
                    const completed = (allClasses || []).filter(c => c.status === "completed").sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
                    return completed.length === 0 ? (
                      <div className="text-center py-10">
                        <History className="w-10 h-10 text-[#1C7BB1]/30 mx-auto mb-3" />
                        <p className="text-sm text-[#0A4A6E]/50">{isEs ? "Sin historial aún" : "No history yet"}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {completed.map(c => (
                          <div key={c.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-[#0A4A6E] truncate">{c.title || c.studentName}</h4>
                                <p className="text-xs text-[#0A4A6E]/50">
                                  {new Date(c.scheduledAt).toLocaleDateString(isEs ? "es-ES" : "en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                                  {" · "}{c.duration} min
                                </p>
                              </div>
                            </div>
                            {(c.sharedNotes || c.homeworkText) && (
                              <div className="mt-2 ml-13 space-y-1">
                                {c.sharedNotes && <p className="text-xs text-[#0A4A6E]/70 line-clamp-1">📝 {c.sharedNotes}</p>}
                                {c.homeworkText && <p className="text-xs text-amber-700 line-clamp-1">📚 {c.homeworkText}</p>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>

            {/* Monthly Earnings Chart */}
            {earnings?.monthly && earnings.monthly.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-base font-semibold text-[#0A4A6E] mb-3">{isEs ? "Desglose Mensual" : "Monthly Breakdown"}</h2>
                  <div className="space-y-2">
                    {earnings.monthly.map(m => {
                      const maxEarnings = Math.max(...earnings.monthly.map(e => e.earnings), 1);
                      const pct = (m.earnings / maxEarnings) * 100;
                      const [year, month] = m.month.split("-");
                      const monthDate = new Date(parseInt(year), parseInt(month) - 1);
                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="text-xs text-[#0A4A6E]/60 w-16 flex-shrink-0">
                            {monthDate.toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", year: "2-digit" })}
                          </span>
                          <div className="flex-1">
                            <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] rounded-full transition-all" style={{ width: `${Math.max(pct, 5)}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-[#0A4A6E] w-20 text-right">${m.earnings} ({m.classes})</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
            {tutorPayments && tutorPayments.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-base font-semibold text-[#0A4A6E] mb-3">
                    {isEs ? "Pagos Recibidos" : "Payments Received"}
                  </h2>
                  <div className="space-y-2">
                    {tutorPayments.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${p.status === "paid" ? "bg-green-100" : "bg-amber-100"}`}>
                          <DollarSign className={`h-4 w-4 ${p.status === "paid" ? "text-green-600" : "text-amber-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0A4A6E]">
                            ${parseFloat(p.amount).toFixed(2)} {p.currency}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(p.periodStart).toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric" })}
                            {" — "}
                            {new Date(p.periodEnd).toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {p.paymentMethod && ` · ${p.paymentMethod}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {p.status === "paid" ? (isEs ? "Pagado" : "Paid") : (isEs ? "Pendiente" : "Pending")}
                          </span>
                          {p.receiptUrl && (
                            <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[#1C7BB1] hover:text-[#0A4A6E]">
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════════ STUDENTS TAB ═══════════════ */}
        {activeTab === "students" && (
          <>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[#0A4A6E]">
                  {isEs ? "Mis Estudiantes" : "My Students"}
                  {students && students.length > 0 && <Badge className="ml-2 bg-[#1C7BB1]/10 text-[#1C7BB1]">{students.length}</Badge>}
                </h2>
                {students && students.length > 3 && (
                  <Input
                    placeholder={isEs ? "Buscar..." : "Search..."}
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-40 h-8 text-xs"
                  />
                )}
              </div>
              {!filteredStudents || filteredStudents.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-10 h-10 text-[#1C7BB1]/30 mx-auto mb-3" />
                  <p className="text-sm text-[#0A4A6E]/50">
                    {isEs ? "Aún no tienes estudiantes" : "No students yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map(student => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-[#EAF4FA]/30 transition-colors cursor-pointer"
                      onClick={() => setDrawerStudentId(student.id)}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {student.profileImage ? (
                          <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="h-5 w-5 text-[#1C7BB1]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-[#0A4A6E] truncate">{student.name}</h4>
                          <LevelBadge level={student.level} size="sm" />
                        </div>
                        <p className="text-[10px] text-[#0A4A6E]/40">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#0A4A6E]/60 flex-shrink-0">
                        <div className="text-center">
                          <p className="font-bold text-[#0A4A6E]">{student.completedClasses}</p>
                          <p className="text-[9px]">{isEs ? "Clases" : "Classes"}</p>
                        </div>
                        {student.lastClassDate && (
                          <div className="text-center hidden sm:block">
                            <p className="text-[10px]">
                              {new Date(student.lastClassDate).toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric" })}
                            </p>
                            <p className="text-[9px]">{isEs ? "Última" : "Last"}</p>
                          </div>
                        )}
                        <button
                          className="p-1 rounded hover:bg-green-100 text-green-400 hover:text-green-600"
                          title={isEs ? "Enviar mensaje" : "Send message"}
                          onClick={(e) => { e.stopPropagation(); setLocation(`/messages?startWith=${student.id}`); }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-[#1C7BB1]/10 text-[#1C7BB1]/40 hover:text-[#1C7BB1]"
                          title={isEs ? "Cambiar nivel" : "Change level"}
                          onClick={(e) => { e.stopPropagation(); setSelectedStudentId(student.id); }}
                        >
                          <GraduationCap className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Level Dialog */}
          <Dialog open={selectedStudentId !== null} onOpenChange={() => setSelectedStudentId(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#1C7BB1]" />
                  {isEs ? "Progreso del Estudiante" : "Student Progress"}
                </DialogTitle>
              </DialogHeader>
              {studentProgress ? (
                <div className="space-y-5 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-[#1C7BB1]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0A4A6E]">{studentProgress.student.name}</h3>
                      <p className="text-xs text-muted-foreground">{studentProgress.student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#EAF4FA] rounded-lg">
                    <p className="text-sm font-medium text-[#0A4A6E]">{isEs ? "Nivel actual" : "Current level"}</p>
                    <Select
                      value={studentProgress.student.level}
                      onValueChange={(val) => { if (selectedStudentId) changeLevelMutation.mutate({ studentId: selectedStudentId, level: val }); }}
                    >
                      <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A2">A2</SelectItem>
                        <SelectItem value="B1">B1</SelectItem>
                        <SelectItem value="B2">B2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-[#0A4A6E]">{studentProgress.stats.classesCompleted}</p>
                      <p className="text-[10px] text-muted-foreground">{isEs ? "Clases" : "Classes"}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-[#0A4A6E]">{studentProgress.stats.completedStations}/{studentProgress.stats.totalStations}</p>
                      <p className="text-[10px] text-muted-foreground">{isEs ? "Estaciones" : "Stations"}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-[#0A4A6E]">{studentProgress.stats.quizAvg}%</p>
                      <p className="text-[10px] text-muted-foreground">{isEs ? "Prom. Quiz" : "Quiz Avg"}</p>
                    </div>
                  </div>
                  {studentProgress.advancementProgress && (
                    <div className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#0A4A6E]">{isEs ? "Progreso hacia" : "Progress to"} {studentProgress.advancementProgress.toLevel}</p>
                        {studentProgress.advancementProgress.isReady && <Badge className="bg-green-100 text-green-700 text-xs">{isEs ? "Listo" : "Ready"}</Badge>}
                      </div>
                      {[
                        { label: isEs ? "Clases" : "Classes", data: studentProgress.advancementProgress.classes },
                        { label: isEs ? "Estaciones" : "Stations", data: studentProgress.advancementProgress.stations },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium">{item.data.current}/{item.data.required}</span>
                          </div>
                          <Progress value={Math.min(100, (item.data.current / item.data.required) * 100)} className="h-2" />
                        </div>
                      ))}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{isEs ? "Prom. Quiz" : "Quiz Avg"}</span>
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

        {/* ═══════════════ PROFILE TAB ═══════════════ */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/40">
                      {editAvatar ? (
                        <img src={editAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-12 h-12 text-white/70" />
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-gray-100">
                      <Upload className="w-3.5 h-3.5 text-[#1C7BB1]" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{tutorProfile?.name || data?.tutor?.name || user.firstName}</h2>
                    <p className="text-white/70 text-sm">{tutorProfile?.email || user.email}</p>
                    {tutorProfile?.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-[#F59E1C] fill-[#F59E1C]" />
                        <span className="text-sm">{parseFloat(tutorProfile.rating).toFixed(1)}</span>
                        <span className="text-white/50 text-xs">({tutorProfile.reviewCount} {isEs ? "reseñas" : "reviews"})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Profile Form */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 md:p-6 space-y-4">
                <h3 className="font-semibold text-[#0A4A6E]">{isEs ? "Información Personal" : "Personal Information"}</h3>

                <div className="space-y-1.5">
                  <Label>{isEs ? "Biografía" : "Bio"}</Label>
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder={isEs ? "Cuéntale a tus estudiantes sobre ti..." : "Tell your students about yourself..."}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{isEs ? "Teléfono" : "Phone"}</Label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+1 555 123 4567" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{isEs ? "Años de experiencia" : "Years of experience"}</Label>
                    <Input type="number" value={editYears} onChange={(e) => setEditYears(e.target.value)} placeholder="5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>{isEs ? "Certificaciones (separadas por coma)" : "Certifications (comma separated)"}</Label>
                  <Input value={editCerts} onChange={(e) => setEditCerts(e.target.value)} placeholder="DELE C1, TESOL, Cambridge CAE" />
                </div>

                <div className="space-y-1.5">
                  <Label>{isEs ? "Idiomas que hablas (separados por coma)" : "Languages you speak (comma separated)"}</Label>
                  <Input value={editLangs} onChange={(e) => setEditLangs(e.target.value)} placeholder="Spanish, English, French" />
                </div>

                <Button
                  className="bg-[#1C7BB1] hover:bg-[#0A4A6E] w-full sm:w-auto"
                  onClick={handleProfileSave}
                  disabled={updateProfileMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending
                    ? (isEs ? "Guardando..." : "Saving...")
                    : (isEs ? "Guardar cambios" : "Save changes")}
                </Button>
              </CardContent>
            </Card>

            {/* Google Calendar */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${googleStatus?.connected ? "bg-green-100" : "bg-gray-100"}`}>
                      <Calendar className={`h-5 w-5 ${googleStatus?.connected ? "text-green-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0A4A6E]">Google Calendar</h3>
                      {googleStatus?.connected ? (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> {isEs ? "Conectado como" : "Connected as"} {googleStatus.googleEmail}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">{isEs ? "Sincroniza tus clases" : "Sync your classes"}</p>
                      )}
                    </div>
                  </div>
                  {googleStatus?.connected ? (
                    <Button variant="outline" size="sm" onClick={() => disconnectGoogleMutation.mutate()} disabled={disconnectGoogleMutation.isPending} className="text-red-500 border-red-200 hover:bg-red-50">
                      <Link2Off className="w-4 h-4 mr-1" /> {isEs ? "Desconectar" : "Disconnect"}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => { window.location.href = "/api/auth/google/connect"; }} className="bg-[#1C7BB1] hover:bg-[#0A4A6E]">
                      <Link2 className="w-4 h-4 mr-1" /> {isEs ? "Conectar" : "Connect"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Availability */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#F59E1C]/10">
                      <Clock className="h-5 w-5 text-[#F59E1C]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0A4A6E]">{isEs ? "Disponibilidad" : "Availability"}</h3>
                      <p className="text-xs text-gray-500">{isEs ? "Configura tu horario semanal" : "Set your weekly schedule"}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/tutor-portal/availability")}>
                    {isEs ? "Gestionar" : "Manage"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Student profile drawer */}
      <StudentProfileDrawer studentId={drawerStudentId} onClose={() => setDrawerStudentId(null)} />

      {/* Notes Modal */}
      <Dialog open={!!notesModal} onOpenChange={(open) => { if (!open) setNotesModal(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEs ? "Completar clase" : "Complete class"}
              {notesModal && <span className="text-sm font-normal text-muted-foreground ml-2">— {notesModal.studentName}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sharedNotes">{isEs ? "Resumen para el alumno" : "Summary for student"}</Label>
              <Textarea id="sharedNotes" placeholder={isEs ? "Lo que trabajaron hoy..." : "What you worked on today..."} value={sharedNotes} onChange={(e) => setSharedNotes(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="homeworkText">{isEs ? "Tarea / próximos pasos" : "Homework / next steps"}</Label>
              <Textarea id="homeworkText" placeholder={isEs ? "Tarea asignada..." : "Homework assigned..."} value={homeworkText} onChange={(e) => setHomeworkText(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sessionNotes">{isEs ? "Notas privadas (solo tú)" : "Private notes (only you)"}</Label>
              <Textarea id="sessionNotes" placeholder={isEs ? "Observaciones personales..." : "Personal observations..."} value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNotesModal(null)}>{isEs ? "Cancelar" : "Cancel"}</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={completeClassMutation.isPending}
              onClick={() => {
                if (!notesModal) return;
                completeClassMutation.mutate(
                  { classId: notesModal.classId, sessionNotes, sharedNotes, homeworkText },
                  { onSuccess: () => setNotesModal(null) }
                );
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {completeClassMutation.isPending ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Confirmar" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
