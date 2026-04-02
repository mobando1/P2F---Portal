import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  User,
  Ban,
  X,
} from "lucide-react";
import BlockTimeDialog from "./BlockTimeDialog";

interface WeekSlot {
  hour: number;
  minute: number;
  time: string;
  available: boolean;
  isRecurring: boolean;
  booked: boolean;
  blocked: boolean;
  classInfo?: string;
  exceptionId?: number;
  blockReason?: string;
}

interface WeekDay {
  date: string;
  dayOfWeek: number;
  slots: WeekSlot[];
}

interface WeekData {
  weekStart: string;
  days: WeekDay[];
  recurringSlots: Array<{ id?: number; dayOfWeek: number; startTime: string; endTime: string }>;
}

const DAY_NAMES_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

const START_HOUR = 8;
const END_HOUR = 20;

export default function CalendarView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const { language } = useLanguage();
  const isEs = language === "es";
  const dayNames = isEs ? DAY_NAMES_ES : DAY_NAMES_EN;

  const [weekOffset, setWeekOffset] = useState(0);
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; date?: string; time?: string }>({ open: false });
  const [selectedDay, setSelectedDay] = useState<string>(""); // Mobile: selected day

  const weekStart = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff + weekOffset * 7);
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
  }, [weekOffset]);

  const { data: weekData, isLoading, isError, refetch } = useQuery<WeekData>({
    queryKey: ["/api/tutor/availability/week", weekStart],
    queryFn: () => apiRequest("GET", `/api/tutor/availability/week?startDate=${weekStart}`).then(r => r.json()),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (exceptionId: number) => {
      const res = await apiRequest("DELETE", `/api/tutor/availability/exception/${exceptionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability/week"] });
      toast({ title: isEs ? "Bloqueo eliminado" : "Block removed" });
    },
  });

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const handleCellClick = (dayData: WeekDay, slot: WeekSlot) => {
    if (slot.booked) return;
    if (slot.blocked && slot.exceptionId) {
      deleteMutation.mutate(slot.exceptionId);
      return;
    }
    // Open block dialog pre-filled
    setBlockDialog({ open: true, date: dayData.date, time: slot.time });
  };

  // Mobile: get the selected day's data
  const mobileDayData = useMemo(() => {
    if (!weekData || !selectedDay) return null;
    return weekData.days.find(d => d.date === selectedDay) || null;
  }, [weekData, selectedDay]);

  // Auto-select first day on mobile when data loads
  useMemo(() => {
    if (weekData && !selectedDay) {
      const todayDay = weekData.days.find(d => d.date === today);
      setSelectedDay(todayDay?.date || weekData.days[0]?.date || "");
    }
  }, [weekData]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0A4A6E]">
            {isEs ? "Calendario" : "Calendar"}
          </h3>
          <p className="text-xs text-[#0A4A6E]/60">
            {isEs
              ? "Ve tu semana y bloquea horarios específicos. Toca un bloqueo rojo para eliminarlo."
              : "View your week and block specific times. Tap a red block to remove it."}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => setBlockDialog({ open: true })}
        >
          <Ban className="h-3.5 w-3.5 mr-1" />
          {isEs ? "Bloquear" : "Block Time"}
        </Button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#1C7BB1]" />
          <span className="text-sm font-medium text-[#0A4A6E]">
            {weekData ? (() => {
              const start = new Date(weekData.weekStart + "T12:00:00");
              const end = new Date(start);
              end.setDate(end.getDate() + 6);
              return `${start.toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric" })} — ${end.toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" })}`;
            })() : "..."}
          </span>
          {weekOffset !== 0 && (
            <Button
              variant="ghost" size="sm" className="text-xs text-[#1C7BB1]"
              onClick={() => { setWeekOffset(0); setSelectedDay(""); }}
            >
              {isEs ? "Hoy" : "Today"}
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setWeekOffset(w => w + 1); setSelectedDay(""); }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> {isEs ? "Disponible" : "Available"}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#1C7BB1]" /> {isEs ? "Clase" : "Booked"}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> {isEs ? "Bloqueado" : "Blocked"}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-gray-200" /> {isEs ? "No disponible" : "Not available"}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-[#1C7BB1]" /></div>
      ) : isError ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-[#0A4A6E]/70 mb-3">
              {isEs ? "No se pudo cargar el calendario." : "Could not load calendar."}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {isEs ? "Reintentar" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      ) : weekData ? (
        <>
          {/* Desktop Grid */}
          <Card className="border-0 shadow-sm overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="w-14 p-2 text-right border-b border-gray-100">
                      <Clock className="h-3 w-3 inline text-gray-400" />
                    </th>
                    {DAY_ORDER.map(dow => {
                      const dayData = weekData.days.find(d => d.dayOfWeek === dow);
                      const isToday = dayData?.date === today;
                      return (
                        <th key={dow} className={`p-2 text-center border-b border-gray-100 ${isToday ? "bg-[#EAF4FA]" : ""}`}>
                          <p className={`text-xs font-semibold ${isToday ? "text-[#1C7BB1]" : "text-[#0A4A6E]"}`}>
                            {dayNames[dow]}
                          </p>
                          {dayData && (
                            <p className={`text-[10px] ${isToday ? "text-[#1C7BB1]" : "text-gray-400"}`}>
                              {new Date(dayData.date + "T12:00:00").getDate()}
                            </p>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time, idx) => (
                    <tr key={time} className={idx % 2 === 0 ? "" : "bg-gray-50/30"}>
                      <td className="p-0 pr-2 text-right">
                        {idx % 2 === 0 && <span className="text-[10px] text-gray-400">{time}</span>}
                      </td>
                      {DAY_ORDER.map(dow => {
                        const dayData = weekData.days.find(d => d.dayOfWeek === dow);
                        const slot = dayData?.slots.find(s => s.time === time);
                        if (!slot || !dayData) return <td key={dow} className="p-0.5"><div className="h-5" /></td>;

                        const isToday = dayData.date === today;
                        let cellClass = "h-5 rounded-sm transition-all text-[7px] flex items-center justify-center ";

                        if (slot.booked) {
                          cellClass += "bg-[#1C7BB1] text-white cursor-default";
                        } else if (slot.blocked) {
                          cellClass += "bg-red-100 border border-red-200 text-red-400 cursor-pointer hover:bg-red-200";
                        } else if (slot.available) {
                          cellClass += "bg-green-100 border border-green-200 cursor-pointer hover:bg-yellow-50 hover:border-yellow-300";
                        } else {
                          cellClass += "bg-white border border-gray-100 cursor-pointer hover:bg-yellow-50 hover:border-yellow-300";
                        }

                        if (isToday && !slot.booked && !slot.blocked) {
                          cellClass += " ring-1 ring-[#1C7BB1]/20";
                        }

                        return (
                          <td key={dow} className="p-0.5">
                            <div
                              className={cellClass}
                              onClick={() => handleCellClick(dayData, slot)}
                              title={
                                slot.booked ? slot.classInfo :
                                slot.blocked ? (slot.blockReason || (isEs ? "Bloqueado — clic para desbloquear" : "Blocked — click to unblock")) :
                                (isEs ? "Clic para bloquear" : "Click to block")
                              }
                            >
                              {slot.booked && <User className="h-2.5 w-2.5" />}
                              {slot.blocked && <X className="h-2.5 w-2.5" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: Day selector + slot list */}
          <div className="md:hidden space-y-3">
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={isEs ? "Seleccionar día" : "Select day"} />
              </SelectTrigger>
              <SelectContent>
                {weekData.days
                  .sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek))
                  .map(day => {
                    const d = new Date(day.date + "T12:00:00");
                    const label = `${dayNames[day.dayOfWeek]} ${d.getDate()} ${d.toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short" })}`;
                    const isToday = day.date === today;
                    return (
                      <SelectItem key={day.date} value={day.date}>
                        {label}{isToday ? (isEs ? " (Hoy)" : " (Today)") : ""}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>

            {mobileDayData && (
              <div className="space-y-1">
                {timeSlots.map(time => {
                  const slot = mobileDayData.slots.find(s => s.time === time);
                  if (!slot) return null;

                  // Skip slots outside 8-20 range
                  if (slot.hour < START_HOUR || slot.hour >= END_HOUR) return null;

                  let bg = "bg-white border-gray-100";
                  let textColor = "text-gray-400";
                  let label = isEs ? "No disponible" : "Not available";
                  let icon = null;

                  if (slot.booked) {
                    bg = "bg-[#1C7BB1]/10 border-[#1C7BB1]/30";
                    textColor = "text-[#1C7BB1]";
                    label = slot.classInfo || (isEs ? "Clase" : "Class");
                    icon = <User className="h-3.5 w-3.5 text-[#1C7BB1]" />;
                  } else if (slot.blocked) {
                    bg = "bg-red-50 border-red-200";
                    textColor = "text-red-500";
                    label = slot.blockReason || (isEs ? "Bloqueado" : "Blocked");
                    icon = <Ban className="h-3.5 w-3.5 text-red-400" />;
                  } else if (slot.available) {
                    bg = "bg-green-50 border-green-200";
                    textColor = "text-green-700";
                    label = isEs ? "Disponible" : "Available";
                  }

                  return (
                    <button
                      key={time}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border ${bg} transition-colors ${
                        slot.booked ? "cursor-default" : "active:scale-[0.98]"
                      }`}
                      onClick={() => !slot.booked && handleCellClick(mobileDayData, slot)}
                      disabled={slot.booked}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#0A4A6E] w-12">{time}</span>
                        <span className={`text-xs ${textColor}`}>{label}</span>
                      </div>
                      {icon}
                      {slot.blocked && slot.exceptionId && (
                        <span className="text-[9px] text-red-400">{isEs ? "Toca para desbloquear" : "Tap to unblock"}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Block Time Dialog */}
      <BlockTimeDialog
        open={blockDialog.open}
        onClose={() => setBlockDialog({ open: false })}
        prefillDate={blockDialog.date}
        prefillTime={blockDialog.time}
      />
    </div>
  );
}
