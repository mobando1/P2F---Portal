import { useRoute, Link, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { getCurrentUser, refreshUserAndCredits } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Star, MapPin, Clock, Award, Calendar, Loader2, ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Repeat, MessageCircle } from "lucide-react";
import { fadeInUp, fadeInLeft, fadeInRight, staggerContainer } from "@/lib/animations";
import { Checkbox } from "@/components/ui/checkbox";

type Tutor = {
  id: number;
  name: string;
  email: string;
  specialization: string;
  specializationEs: string | null;
  bio: string | null;
  bioEs: string | null;
  avatar: string | null;
  rating: string;
  reviewCount: number;
  classType: string;
  languageTaught: string;
  country: string | null;
  timezone: string | null;
  languages: string[] | null;
  certifications: string[] | null;
  yearsOfExperience: number | null;
  userId: number | null;
};

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  userName: string;
  userAvatar: string | null;
  createdAt: string;
};

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

// Helper: get Monday of the week containing a date
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Helper: format date as YYYY-MM-DD
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

const DAY_NAMES_ES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Weekly Grid View — Preply-style day columns with available time pills
function WeeklyGridView({ tutorId, weekStart, isEs, onSlotSelect, onWeekChange, selectedDate, selectedSlot }: {
  tutorId: number;
  weekStart: string;
  isEs: boolean;
  onSlotSelect: (date: string, slot: string) => void;
  onWeekChange: (dir: number) => void;
  selectedDate?: string;
  selectedSlot?: string | null;
}) {
  const { data, isLoading } = useQuery<{
    weekStart: string;
    days: Array<{ date: string; dayOfWeek: number; isPast: boolean; slots: Array<{ start: string; end: string; available: boolean }> }>;
  }>({
    queryKey: [`/api/calendar/tutor/${tutorId}/week`, weekStart],
    queryFn: () => apiRequest("GET", `/api/calendar/tutor/${tutorId}/week?startDate=${weekStart}`).then(r => r.json()),
  });

  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  const dayLabels = isEs ? DAY_NAMES_ES : DAY_NAMES_EN;

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-[#1C7BB1]" /></div>;
  }

  const hasAnySlots = data?.days.some(d => d.slots.length > 0);

  if (!data || !hasAnySlots) {
    return (
      <div className="text-center py-10">
        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{isEs ? "No hay horarios disponibles esta semana" : "No available times this week"}</p>
        <button onClick={() => onWeekChange(1)} className="mt-3 text-sm text-[#1C7BB1] hover:underline font-medium">
          {isEs ? "Ver siguiente semana →" : "See next week →"}
        </button>
      </div>
    );
  }

  // Build week range label
  const startDate = new Date(data.weekStart + "T12:00:00");
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const weekLabel = `${startDate.toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric" })} — ${endDate.toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric" })}`;

  return (
    <div>
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => onWeekChange(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-[#0A4A6E]" />
        </button>
        <span className="text-base font-semibold text-[#0A4A6E]">{weekLabel}</span>
        <button onClick={() => onWeekChange(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronRight className="h-5 w-5 text-[#0A4A6E]" />
        </button>
      </div>

      {/* Day Columns — Preply style */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3">
        {DAY_ORDER.map((dow, idx) => {
          const dayData = data.days.find(d => d.dayOfWeek === dow);
          const dateObj = dayData ? new Date(dayData.date + "T12:00:00") : null;
          const dateNum = dateObj ? dateObj.getDate() : "";
          const isToday = dayData?.date === new Date().toISOString().split("T")[0];
          const availableSlots = dayData?.slots.filter(s => s.available) || [];

          return (
            <div key={dow} className="flex flex-col items-center">
              {/* Day Header */}
              <div className={`text-center mb-2 pb-2 w-full border-b-2 ${isToday ? "border-[#1C7BB1]" : "border-transparent"}`}>
                <p className={`text-xs font-semibold ${isToday ? "text-[#1C7BB1]" : "text-[#0A4A6E]"}`}>
                  {dayLabels[idx]}
                </p>
                <p className={`text-sm font-bold ${isToday ? "text-[#1C7BB1]" : "text-[#0A4A6E]/70"}`}>
                  {dateNum}
                </p>
              </div>

              {/* Available Time Slots */}
              <div className="w-full space-y-1.5">
                {availableSlots.length > 0 ? (
                  availableSlots.map(slot => {
                    const isSelected = selectedDate === dayData?.date && selectedSlot === slot.start;
                    return (
                      <button
                        key={slot.start}
                        onClick={() => onSlotSelect(dayData!.date, slot.start)}
                        className={`w-full py-2 rounded-full border text-xs font-medium transition-all active:scale-95 ${
                          isSelected
                            ? "bg-[#1C7BB1] text-white border-[#1C7BB1] shadow-md"
                            : "border-[#1C7BB1]/25 bg-white text-[#1C7BB1] hover:bg-[#1C7BB1] hover:text-white hover:border-[#1C7BB1]"
                        }`}
                      >
                        {slot.start}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-300 text-xs py-3">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timezone */}
      <p className="text-[10px] text-gray-400 mt-4 text-center">
        {isEs ? "En tu zona horaria local" : "In your local timezone"}
      </p>
    </div>
  );
}

function TutorBookingCalendar({ tutorId, tutorName, tutorAvatar, isEs }: { tutorId: number; tutorName: string; tutorAvatar: string | null; isEs: boolean }) {
  const user = getCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  // Book mutations
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !selectedDate) throw new Error("Missing");
      const [sh, sm] = selectedSlot.split(":").map(Number);
      const endMin = sh * 60 + sm + 60;
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      const response = await apiRequest("POST", "/api/calendar/book", {
        tutorId,
        date: selectedDate,
        startTime: selectedSlot,
        endTime,
      });
      return response.json();
    },
    onSuccess: async () => {
      await refreshUserAndCredits(queryClient, user?.id);
      toast({ title: isEs ? "Clase reservada" : "Class booked", description: isEs ? "Tu clase ha sido reservada exitosamente." : "Your class has been booked successfully." });
      setSelectedSlot(null);
      setSelectedDate("");
    },
    onError: () => {
      toast({ title: "Error", description: isEs ? "No se pudo reservar la clase." : "Could not book the class.", variant: "destructive" });
    },
  });

  const bookTrialMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !selectedDate) throw new Error("Missing");
      const scheduledAt = `${selectedDate}T${selectedSlot}`;
      const response = await apiRequest("POST", "/api/classes/book-trial", { tutorId, scheduledAt });
      return response.json();
    },
    onSuccess: async () => {
      await refreshUserAndCredits(queryClient, user?.id);
      toast({ title: isEs ? "Clase de prueba reservada" : "Trial class booked", description: isEs ? "Tu clase gratuita ha sido reservada." : "Your free trial has been booked." });
      setSelectedSlot(null);
      setSelectedDate("");
    },
    onError: (err: any) => {
      let msg = isEs ? "No se pudo reservar." : "Could not book.";
      try {
        const body = err?.message?.includes(":") ? err.message.substring(err.message.indexOf(":") + 2) : "";
        const parsed = JSON.parse(body);
        if (parsed?.message) msg = parsed.message;
      } catch { /* use default */ }
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const bookRecurringMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !selectedDate) throw new Error("Missing");
      const response = await apiRequest("POST", "/api/classes/book-recurring", {
        tutorId,
        startDate: selectedDate,
        startTime: selectedSlot,
        weeksCount: recurringWeeks,
      });
      return response.json();
    },
    onSuccess: async (data: any) => {
      await refreshUserAndCredits(queryClient, user?.id);
      toast({
        title: isEs ? "Clases recurrentes reservadas" : "Recurring classes booked",
        description: isEs ? `${data.booked || recurringWeeks} clases reservadas exitosamente.` : `${data.booked || recurringWeeks} classes booked successfully.`,
      });
      setSelectedSlot(null);
      setSelectedDate("");
      setIsRecurring(false);
    },
    onError: () => {
      toast({ title: "Error", description: isEs ? "No se pudieron reservar las clases." : "Could not book recurring classes.", variant: "destructive" });
    },
  });

  const canBookTrial = user && !user.trialCompleted;
  const hasCredits = canBookTrial || (user?.classCredits ?? 0) > 0;
  const isAnyPending = bookMutation.isPending || bookTrialMutation.isPending || bookRecurringMutation.isPending;

  const handleBook = () => {
    if (isRecurring && !canBookTrial) {
      bookRecurringMutation.mutate();
    } else if (canBookTrial) {
      bookTrialMutation.mutate();
    } else {
      bookMutation.mutate();
    }
  };

  return (
    <Card className="p-5 md:p-6">
      <h3 className="text-lg font-bold text-[#0A4A6E] mb-4">
        {isEs ? "Reservar Clase" : "Book a Class"}
      </h3>

      {canBookTrial && (
        <div className="bg-[#F59E1C]/10 border border-[#F59E1C]/30 rounded-lg p-2.5 mb-4">
          <p className="text-xs font-medium text-[#0A4A6E]">
            {isEs ? "Tu primera clase de 50 min es GRATIS" : "Your first 50-min class is FREE"}
          </p>
        </div>
      )}

      {/* Weekly Grid (Preply-style) */}
      <WeeklyGridView
        tutorId={Number(tutorId) || 0}
        weekStart={toDateStr(weekStart)}
        isEs={isEs}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onSlotSelect={(date: string, slot: string) => {
          setSelectedDate(date);
          setSelectedSlot(slot);
        }}
        onWeekChange={(dir: number) => {
          const current = new Date(weekStart);
          current.setDate(current.getDate() + dir * 7);
          const minMonday = getMonday(new Date());
          if (current >= minMonday) {
            setWeekStart(current);
          }
        }}
      />

      {/* BOOKING PANEL */}
      {selectedSlot && selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-gray-100 space-y-3"
        >
          {/* Summary */}
          <div className="bg-[#EAF4FA] rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{isEs ? "Resumen" : "Summary"}</p>
            <p className="text-sm font-semibold text-[#0A4A6E]">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString(isEs ? "es" : "en", { weekday: "short", month: "short", day: "numeric" })}
              {" "}{isEs ? "a las" : "at"} {selectedSlot}
            </p>
            <p className="text-xs text-gray-500">{canBookTrial ? "50 min" : "60 min"} - {tutorName}</p>
          </div>

          {/* Recurring option (only for paid, not trial) */}
          {!canBookTrial && user && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked === true)}
                />
                <span className="text-xs font-medium text-[#0A4A6E] flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  {isEs ? "Repetir cada semana" : "Repeat weekly"}
                </span>
              </label>

              {isRecurring && (
                <div className="flex gap-1.5 ml-6">
                  {[4, 8, 12].map(w => (
                    <button
                      key={w}
                      onClick={() => setRecurringWeeks(w)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        recurringWeeks === w
                          ? "bg-[#1C7BB1] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {w} {isEs ? "sem" : "wks"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Book Button */}
          {user ? (
            !hasCredits ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center space-y-2">
                <p className="text-sm font-medium text-red-700">
                  {isEs ? "No tienes créditos de clase disponibles" : "No class credits available"}
                </p>
                <Link href="/packages">
                  <Button variant="outline" className="text-xs border-[#1C7BB1] text-[#1C7BB1] hover:bg-[#EAF4FA]">
                    {isEs ? "Comprar clases" : "Buy classes"}
                  </Button>
                </Link>
              </div>
            ) : (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className={`w-full font-semibold py-5 text-white shadow-lg ${
                  canBookTrial
                    ? "bg-[#F59E1C] hover:bg-[#e08a0e] shadow-[#F59E1C]/20"
                    : "bg-[#1C7BB1] hover:bg-[#0A4A6E] shadow-[#1C7BB1]/20"
                }`}
                disabled={isAnyPending}
                onClick={handleBook}
              >
                {isAnyPending
                  ? (isEs ? "Reservando..." : "Booking...")
                  : canBookTrial
                    ? (isEs ? "Reservar Clase Gratis" : "Book Free Trial")
                    : isRecurring
                      ? (isEs ? `Reservar ${recurringWeeks} Clases` : `Book ${recurringWeeks} Classes`)
                      : (isEs ? "Reservar Clase" : "Book Class")}
              </Button>
            </motion.div>
            )
          ) : (
            <p className="text-center text-xs text-gray-400">
              <Link href="/login" className="text-[#1C7BB1] underline">
                {isEs ? "Inicia sesion" : "Log in"}
              </Link>
              {" "}{isEs ? "para reservar" : "to book"}
            </p>
          )}
        </motion.div>
      )}
    </Card>
  );
}

export default function TutorProfilePage() {
  const [, params] = useRoute("/tutor/:id");
  const [, setLocation] = useLocation();
  const tutorId = params?.id;
  const { language } = useLanguage();
  const isEs = language === "es";
  const currentUser = getCurrentUser();

  const { data: tutor, isLoading } = useQuery<Tutor>({
    queryKey: [`/api/tutors/${tutorId}`],
    enabled: !!tutorId,
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery<Review[]>({
    queryKey: [`/api/tutors/${tutorId}/reviews`],
    enabled: !!tutorId,
  });

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const hasReviewed = currentUser && reviews.some((r: any) => r.userId === currentUser.id);
  const canReview = currentUser && currentUser.userType !== "tutor" && currentUser.userType !== "admin" && !hasReviewed;

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tutors/${tutorId}/reviews`, {
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      refetchReviews();
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewComment("");
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async () => {
      // Use tutor's userId (user account), not tutorId (tutor profile ID)
      const recipientUserId = tutor?.userId;
      if (!recipientUserId) throw new Error("Tutor has no linked account");
      const res = await apiRequest("POST", "/api/messages/start", {
        recipientId: recipientUserId,
        message: isEs ? "Hola! Me gustaria saber mas sobre tus clases." : "Hi! I'd like to know more about your classes.",
      });
      return res.json();
    },
    onSuccess: () => {
      setLocation("/messages");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EAF4FA]">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]" />
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-[#EAF4FA]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-700">
            {isEs ? "Profesor no encontrado" : "Tutor not found"}
          </h2>
          <Link href="/tutors">
            <Button className="mt-4 bg-[#1C7BB1]">
              {isEs ? "Volver a Profesores" : "Back to Tutors"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link href="/tutors">
          <Button variant="ghost" className="mb-6 text-[#1C7BB1] hover:text-[#0A4A6E] -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isEs ? "Volver a Profesores" : "Back to Tutors"}
          </Button>
        </Link>

        {/* Tutor Profile Header — above calendar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                {tutor.avatar ? (
                  <img src={tutor.avatar} alt={tutor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#1C7BB1] flex items-center justify-center text-white text-3xl font-bold">
                    {tutor.name.split(" ").map(n => n[0]).join("")}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#0A4A6E]">{tutor.name}</h1>
                <p className="text-[#1C7BB1] font-medium mt-1">{isEs && tutor.specializationEs ? tutor.specializationEs : tutor.specialization}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#F59E1C] text-[#F59E1C]" />
                    <span className="font-semibold">{tutor.rating}</span>
                    <span>({tutor.reviewCount} {isEs ? "resenas" : "reviews"})</span>
                  </div>
                  {tutor.country && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{tutor.country}</span>
                    </div>
                  )}
                  {tutor.yearsOfExperience && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{tutor.yearsOfExperience} {isEs ? "anos exp." : "yrs exp."}</span>
                    </div>
                  )}
                </div>
                {tutor.languages && tutor.languages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tutor.languages.map(lang => (
                      <span key={lang} className="px-2 py-1 bg-[#EAF4FA] text-[#1C7BB1] rounded-full text-xs font-medium">
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
                {currentUser && tutor.userId && (
                  <div className="mt-4">
                    <Button
                      onClick={() => startConversationMutation.mutate()}
                      disabled={startConversationMutation.isPending || !tutor.userId}
                      variant="outline"
                      className="border-[#1C7BB1] text-[#1C7BB1] hover:bg-[#1C7BB1] hover:text-white"
                    >
                      {startConversationMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <MessageCircle className="w-4 h-4 mr-2" />
                      )}
                      {isEs ? "Enviar Mensaje" : "Send Message"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Booking Calendar — Full Width (Preply-style) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8"
        >
          <TutorBookingCalendar tutorId={tutor.id} tutorName={tutor.name} tutorAvatar={tutor.avatar} isEs={isEs} />
        </motion.div>

        <div className="grid grid-cols-1 gap-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* About */}
            <motion.div variants={fadeInUp}>
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#0A4A6E] mb-3">
                  {isEs ? "Sobre mi" : "About Me"}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{isEs && tutor.bioEs ? tutor.bioEs : tutor.bio}</p>
              </Card>
            </motion.div>

            {/* Certifications */}
            {tutor.certifications && tutor.certifications.length > 0 && (
              <motion.div variants={fadeInUp}>
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#0A4A6E] mb-3">
                    {isEs ? "Certificaciones" : "Certifications"}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {tutor.certifications.map(cert => (
                      <div key={cert} className="flex items-center gap-2 px-3 py-2 bg-[#F59E1C]/10 rounded-lg">
                        <Award className="w-4 h-4 text-[#F59E1C]" />
                        <span className="text-sm font-medium text-[#0A4A6E]">{cert}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Reviews */}
            <motion.div variants={fadeInUp}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#0A4A6E]">
                    {isEs ? "Resenas de Estudiantes" : "Student Reviews"} ({reviews.length})
                  </h2>
                  <div className="flex items-center gap-3">
                    {reviews.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Star className="w-5 h-5 fill-[#F59E1C] text-[#F59E1C]" />
                        <span className="text-lg font-bold text-[#0A4A6E]">{tutor.rating}</span>
                      </div>
                    )}
                    {canReview && (
                      <Button size="sm" className="bg-[#F59E1C] hover:bg-[#e08a0e]" onClick={() => setShowReviewModal(true)}>
                        <Star className="h-3.5 w-3.5 mr-1" />
                        {isEs ? "Dejar Reseña" : "Leave Review"}
                      </Button>
                    )}
                  </div>
                </div>
                {reviews.length === 0 ? (
                  <p className="text-gray-500">
                    {isEs ? "Aun no hay resenas" : "No reviews yet"}
                  </p>
                ) : (
                  <div className="space-y-5">
                    {reviews.map(review => {
                      const reviewDate = new Date(review.createdAt);
                      const now = new Date();
                      const diffMs = now.getTime() - reviewDate.getTime();
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      let timeAgo: string;
                      if (diffDays === 0) timeAgo = isEs ? "Hoy" : "Today";
                      else if (diffDays === 1) timeAgo = isEs ? "Ayer" : "Yesterday";
                      else if (diffDays < 7) timeAgo = isEs ? `Hace ${diffDays} dias` : `${diffDays} days ago`;
                      else if (diffDays < 30) {
                        const weeks = Math.floor(diffDays / 7);
                        timeAgo = isEs ? `Hace ${weeks} semana${weeks > 1 ? "s" : ""}` : `${weeks} week${weeks > 1 ? "s" : ""} ago`;
                      } else if (diffDays < 365) {
                        const months = Math.floor(diffDays / 30);
                        timeAgo = isEs ? `Hace ${months} mes${months > 1 ? "es" : ""}` : `${months} month${months > 1 ? "s" : ""} ago`;
                      } else {
                        timeAgo = isEs ? "Hace mas de un ano" : "Over a year ago";
                      }

                      return (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-gray-100 pb-5 last:border-0"
                        >
                          <div className="flex items-start gap-3">
                            {/* Reviewer Avatar */}
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                              {review.userAvatar ? (
                                <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#1C7BB1] flex items-center justify-center text-white text-sm font-bold">
                                  {review.userName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#0A4A6E]">{review.userName}</span>
                                  <div className="flex">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-3.5 h-3.5 ${i < review.rating ? "fill-[#F59E1C] text-[#F59E1C]" : "text-gray-200"}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <span className="text-xs text-gray-400">{timeAgo}</span>
                              </div>
                              {review.comment && (
                                <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">{review.comment}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>

        </div>
      </main>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#0A4A6E] mb-1">
              {isEs ? "Dejar una reseña" : "Leave a review"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{tutor.name}</p>

            {/* Star rating */}
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-0.5"
                >
                  <Star className={`w-8 h-8 transition-colors ${
                    star <= reviewRating ? "fill-[#F59E1C] text-[#F59E1C]" : "text-gray-300"
                  }`} />
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1C7BB1]/20 focus:border-[#1C7BB1]"
              rows={3}
              placeholder={isEs ? "Cuéntanos sobre tu experiencia (opcional)" : "Tell us about your experience (optional)"}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />

            {submitReviewMutation.isError && (
              <p className="text-sm text-red-600 mt-2">
                {(submitReviewMutation.error as any)?.message?.includes("already")
                  ? (isEs ? "Ya dejaste una reseña para este tutor." : "You already reviewed this tutor.")
                  : (isEs ? "Error al enviar. Intenta de nuevo." : "Failed to submit. Try again.")}
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowReviewModal(false)}>
                {isEs ? "Cancelar" : "Cancel"}
              </Button>
              <Button
                className="flex-1 bg-[#F59E1C] hover:bg-[#e08a0e]"
                onClick={() => submitReviewMutation.mutate()}
                disabled={submitReviewMutation.isPending}
              >
                {submitReviewMutation.isPending ? "..." : (isEs ? "Enviar" : "Submit")}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
