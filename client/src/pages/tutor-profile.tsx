import { useRoute, Link, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
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

// Weekly Grid View — shows all available slots for a week at once (Preply-style)
function WeeklyGridView({ tutorId, weekStart, isEs, onSlotSelect, onWeekChange }: {
  tutorId: number;
  weekStart: string;
  isEs: boolean;
  onSlotSelect: (date: string, slot: string) => void;
  onWeekChange: (dir: number) => void;
}) {
  const { data, isLoading } = useQuery<{
    weekStart: string;
    days: Array<{ date: string; dayOfWeek: number; isPast: boolean; slots: Array<{ start: string; end: string; available: boolean }> }>;
  }>({
    queryKey: [`/api/calendar/tutor/${tutorId}/week`, weekStart],
    queryFn: () => apiRequest("GET", `/api/calendar/tutor/${tutorId}/week?startDate=${weekStart}`).then(r => r.json()),
  });

  // Get all unique time slots across the week
  const allTimes = useMemo(() => {
    if (!data) return [];
    const timeSet = new Set<string>();
    data.days.forEach(d => d.slots.forEach(s => timeSet.add(s.start)));
    return Array.from(timeSet).sort();
  }, [data]);

  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  const dayLabels = isEs ? DAY_NAMES_ES : DAY_NAMES_EN;

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-[#1C7BB1]" /></div>;
  }

  if (!data || allTimes.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{isEs ? "No hay horarios disponibles esta semana" : "No available times this week"}</p>
        <button onClick={() => onWeekChange(1)} className="mt-2 text-xs text-[#1C7BB1] hover:underline">
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
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onWeekChange(-1)} className="p-1 rounded hover:bg-gray-100">
          <ChevronLeft className="h-4 w-4 text-[#0A4A6E]" />
        </button>
        <span className="text-sm font-medium text-[#0A4A6E]">{weekLabel}</span>
        <button onClick={() => onWeekChange(1)} className="p-1 rounded hover:bg-gray-100">
          <ChevronRight className="h-4 w-4 text-[#0A4A6E]" />
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[500px]">
          <thead>
            <tr>
              <th className="w-14 p-1" />
              {DAY_ORDER.map((dow, idx) => {
                const dayData = data.days.find(d => d.dayOfWeek === dow);
                const dateNum = dayData ? new Date(dayData.date + "T12:00:00").getDate() : "";
                return (
                  <th key={dow} className="p-1 text-center">
                    <p className="text-xs font-semibold text-[#0A4A6E]">{dayLabels[idx]}</p>
                    <p className="text-[10px] text-gray-400">{dateNum}</p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allTimes.map(time => (
              <tr key={time}>
                <td className="p-0.5 text-right pr-2">
                  <span className="text-[10px] text-gray-400">{time}</span>
                </td>
                {DAY_ORDER.map(dow => {
                  const dayData = data.days.find(d => d.dayOfWeek === dow);
                  const slot = dayData?.slots.find(s => s.start === time);
                  const hasSlot = slot && slot.available;

                  return (
                    <td key={dow} className="p-0.5">
                      {hasSlot ? (
                        <button
                          onClick={() => onSlotSelect(dayData!.date, time)}
                          className="w-full h-7 rounded-md border border-[#1C7BB1]/30 bg-white text-[#1C7BB1] text-[11px] font-medium hover:bg-[#1C7BB1] hover:text-white transition-all"
                        >
                          {time}
                        </button>
                      ) : (
                        <div className="w-full h-7 flex items-center justify-center">
                          <span className="text-gray-300 text-[10px]">—</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TutorBookingCalendar({ tutorId, tutorName, tutorAvatar, isEs }: { tutorId: number; tutorName: string; tutorAvatar: string | null; isEs: boolean }) {
  const user = getCurrentUser();
  const { toast } = useToast();
  const [view, setView] = useState<"week" | "month" | "grid">("week");
  const [weekStart, setWeekStart] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getMonday(tomorrow);
  });
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Fetch availability for each day of the visible week
  const weekDateStrs = weekDays.map(toDateStr);
  const weekQueries = weekDateStrs.map((dateStr) => {
    const dayDate = new Date(dateStr);
    const isPast = dayDate < today;
    return useQuery<TimeSlot[]>({
      queryKey: [`/api/calendar/tutor/${tutorId}/availability`, dateStr],
      queryFn: async () => {
        const res = await fetch(`/api/calendar/tutor/${tutorId}/availability?date=${dateStr}`, { credentials: "include" });
        if (!res.ok) return [];
        return res.json();
      },
      enabled: !isPast,
      staleTime: 60000,
    });
  });

  // For month view: fetch selected day's slots
  const { data: monthDaySlots, isLoading: monthDayLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/calendar/tutor/${tutorId}/availability`, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/tutor/${tutorId}/availability?date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: view === "month" && !!selectedDate,
  });

  // Book mutations
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !selectedDate) throw new Error("Missing");
      const response = await apiRequest("POST", "/api/calendar/book", {
        tutorId,
        date: selectedDate,
        startTime: selectedSlot,
        endTime: selectedSlot,
      });
      return response.json();
    },
    onSuccess: () => {
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
    onSuccess: () => {
      toast({ title: isEs ? "Clase de prueba reservada" : "Trial class booked", description: isEs ? "Tu clase gratuita ha sido reservada." : "Your free trial has been booked." });
      setSelectedSlot(null);
      setSelectedDate("");
    },
    onError: () => {
      toast({ title: "Error", description: isEs ? "No se pudo reservar." : "Could not book.", variant: "destructive" });
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
    onSuccess: (data: any) => {
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
  const dayNames = isEs ? DAY_NAMES_ES : DAY_NAMES_EN;
  const monthNames = isEs ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const isAnyPending = bookMutation.isPending || bookTrialMutation.isPending || bookRecurringMutation.isPending;

  // Week navigation
  const prevWeek = () => {
    const minWeekStart = getMonday(new Date());
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    if (prev >= minWeekStart) setWeekStart(prev);
  };
  const nextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  // Month navigation
  const prevMonth = () => {
    const prev = new Date(monthDate);
    prev.setMonth(prev.getMonth() - 1);
    if (prev >= new Date(today.getFullYear(), today.getMonth(), 1)) setMonthDate(prev);
  };
  const nextMonth = () => {
    const next = new Date(monthDate);
    next.setMonth(next.getMonth() + 1);
    setMonthDate(next);
  };

  // Generate month grid
  const monthYear = monthDate.getFullYear();
  const monthIdx = monthDate.getMonth();
  const firstDay = new Date(monthYear, monthIdx, 1);
  const lastDay = new Date(monthYear, monthIdx + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDay.getDate();

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
    <Card className="p-5">
      {/* Header with tutor avatar + title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {tutorAvatar ? (
            <img src={tutorAvatar} alt={tutorName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1C7BB1] flex items-center justify-center text-white text-sm font-bold">
              {tutorName.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0A4A6E]">
            {isEs ? "Reservar Clase" : "Book a Class"}
          </h3>
          <p className="text-xs text-gray-500">{tutorName}</p>
        </div>
      </div>

      {canBookTrial && (
        <div className="bg-[#F59E1C]/10 border border-[#F59E1C]/30 rounded-lg p-2.5 mb-4">
          <p className="text-xs font-medium text-[#0A4A6E]">
            {isEs ? "Tu primera clase de 50 min es GRATIS" : "Your first 50-min class is FREE"}
          </p>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => { setView("week"); setSelectedSlot(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            view === "week" ? "bg-white shadow-sm text-[#0A4A6E]" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {isEs ? "Semana" : "Week"}
        </button>
        <button
          onClick={() => { setView("month"); setSelectedSlot(null); setSelectedDate(""); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            view === "month" ? "bg-white shadow-sm text-[#0A4A6E]" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          {isEs ? "Mes" : "Month"}
        </button>
        <button
          onClick={() => { setView("grid"); setSelectedSlot(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            view === "grid" ? "bg-white shadow-sm text-[#0A4A6E]" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          {isEs ? "Horarios" : "Schedule"}
        </button>
      </div>

      {/* WEEK VIEW */}
      {view === "week" && (
        <div>
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevWeek} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-[#0A4A6E]">
              {weekDays[0].getDate()} {monthNames[weekDays[0].getMonth()].slice(0, 3)} - {weekDays[6].getDate()} {monthNames[weekDays[6].getMonth()].slice(0, 3)}
            </span>
            <button onClick={nextWeek} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {weekDays.map((day, dayIdx) => {
              const dateStr = toDateStr(day);
              const isPast = day < today;
              const isSelected = selectedDate === dateStr;
              const query = weekQueries[dayIdx];
              const daySlots = (query?.data || []).filter(s => s.available);
              const hasSlots = daySlots.length > 0 && !isPast;

              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    if (!isPast) {
                      setSelectedDate(dateStr);
                      setSelectedSlot(null);
                    }
                  }}
                  disabled={isPast}
                  className={`flex flex-col items-center py-2 rounded-lg text-center transition-all ${
                    isPast
                      ? "opacity-30 cursor-not-allowed"
                      : isSelected
                        ? "bg-[#1C7BB1] text-white shadow-md"
                        : hasSlots
                          ? "bg-[#EAF4FA] hover:bg-[#d4ecf6] cursor-pointer"
                          : "bg-gray-50 text-gray-400"
                  }`}
                >
                  <span className="text-[10px] font-medium">{dayNames[dayIdx]}</span>
                  <span className="text-sm font-bold">{day.getDate()}</span>
                  {hasSlots && !isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1C7BB1] mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Time Slots for Selected Day */}
          {selectedDate && (() => {
            const dayIdx = weekDays.findIndex(d => toDateStr(d) === selectedDate);
            const query = dayIdx >= 0 ? weekQueries[dayIdx] : null;
            const loading = query?.isLoading;
            const daySlots = (query?.data || []).filter(s => s.available);

            return (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {isEs ? "Horarios disponibles" : "Available times"}
                </p>
                {loading ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[#1C7BB1]" />
                  </div>
                ) : daySlots.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">
                    {isEs ? "Sin horarios" : "No times available"}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                    {daySlots.map((slot) => (
                      <Button
                        key={slot.startTime}
                        variant="outline"
                        size="sm"
                        className={`text-xs h-8 ${
                          selectedSlot === slot.startTime
                            ? "bg-[#1C7BB1] text-white border-[#1C7BB1]"
                            : "border-[#1C7BB1]/20 text-[#0A4A6E] hover:bg-[#EAF4FA]"
                        }`}
                        onClick={() => setSelectedSlot(slot.startTime)}
                      >
                        {slot.startTime}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* MONTH VIEW */}
      {view === "month" && (
        <div>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-[#0A4A6E]">
              {monthNames[monthIdx]} {monthYear}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map(name => (
              <div key={name} className="text-center text-[10px] font-medium text-gray-400 py-1">{name}</div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const dayDate = new Date(monthYear, monthIdx, dayNum);
              const dateStr = toDateStr(dayDate);
              const isPast = dayDate < today;
              const isSelected = selectedDate === dateStr;
              const isToday = toDateStr(dayDate) === toDateStr(new Date());

              return (
                <button
                  key={dayNum}
                  onClick={() => {
                    if (!isPast) {
                      setSelectedDate(dateStr);
                      setSelectedSlot(null);
                    }
                  }}
                  disabled={isPast}
                  className={`h-9 rounded-lg text-xs font-medium flex items-center justify-center relative transition-all ${
                    isPast
                      ? "text-gray-300 cursor-not-allowed"
                      : isSelected
                        ? "bg-[#1C7BB1] text-white shadow-md"
                        : isToday
                          ? "bg-[#F59E1C]/20 text-[#0A4A6E] font-bold"
                          : "hover:bg-[#EAF4FA] text-[#0A4A6E]"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Tutor photo + selected day slots */}
          {selectedDate && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {tutorAvatar ? (
                    <img src={tutorAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#1C7BB1] flex items-center justify-center text-white text-[10px] font-bold">
                      {tutorName.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString(isEs ? "es" : "en", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>

              {monthDayLoading ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-[#1C7BB1]" />
                </div>
              ) : (monthDaySlots || []).filter(s => s.available).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">
                  {isEs ? "Sin horarios disponibles" : "No available times"}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 max-h-28 overflow-y-auto">
                  {(monthDaySlots || []).filter(s => s.available).map((slot) => (
                    <Button
                      key={slot.startTime}
                      variant="outline"
                      size="sm"
                      className={`text-xs h-8 ${
                        selectedSlot === slot.startTime
                          ? "bg-[#1C7BB1] text-white border-[#1C7BB1]"
                          : "border-[#1C7BB1]/20 text-[#0A4A6E] hover:bg-[#EAF4FA]"
                      }`}
                      onClick={() => setSelectedSlot(slot.startTime)}
                    >
                      {slot.startTime}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GRID VIEW — Weekly schedule (Preply-style) */}
      {view === "grid" && (
        <WeeklyGridView
          tutorId={Number(tutorId) || 0}
          weekStart={toDateStr(weekStart)}
          isEs={isEs}
          onSlotSelect={(date: string, slot: string) => {
            setSelectedDate(date);
            setSelectedSlot(slot);
          }}
          onWeekChange={(dir: number) => {
            const current = new Date(weekStart);
            current.setDate(current.getDate() + dir * 7);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const minMonday = getMonday(tomorrow);
            if (current >= minMonday) {
              setWeekStart(current);
            }
          }}
        />
      )}

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 space-y-6"
          >
            {/* Profile Header */}
            <motion.div variants={fadeInLeft}>
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                    {tutor.avatar ? (
                      <img
                        src={tutor.avatar}
                        alt={tutor.name}
                        className="w-full h-full object-cover"
                      />
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

          {/* Booking Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24">
              <TutorBookingCalendar tutorId={tutor.id} tutorName={tutor.name} tutorAvatar={tutor.avatar} isEs={isEs} />
            </div>
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
