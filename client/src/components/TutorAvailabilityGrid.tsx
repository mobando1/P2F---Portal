import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Ban,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface WeekSlot {
  hour: number;
  minute: number;
  time: string;
  available: boolean;
  isRecurring: boolean;
  booked: boolean;
  blocked: boolean;
  classInfo?: string;
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

interface TutorAvailabilityGridProps {
  showBackButton?: boolean;
  className?: string;
}

export default function TutorAvailabilityGrid({ showBackButton, className }: TutorAvailabilityGridProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const { language } = useLanguage();
  const isEs = language === "es";
  const dayNames = isEs ? DAY_NAMES_ES : DAY_NAMES_EN;

  const [weekOffset, setWeekOffset] = useState(0);
  const [toggledSlots, setToggledSlots] = useState<Map<string, boolean>>(new Map());
  const [isDirty, setIsDirty] = useState(false);
  const [exDate, setExDate] = useState("");
  const [exReason, setExReason] = useState("");

  // Calculate the Monday of the target week
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

  const saveMutation = useMutation({
    mutationFn: async (slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) => {
      const res = await apiRequest("PUT", "/api/tutor/availability", { slots });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability/week"] });
      setToggledSlots(new Map());
      setIsDirty(false);
      toast({ title: isEs ? "Disponibilidad guardada" : "Availability saved" });
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  });

  const addExceptionMutation = useMutation({
    mutationFn: async (data: { date: string; reason: string }) => {
      const res = await apiRequest("POST", "/api/tutor/availability/exception", {
        date: data.date,
        isBlocked: true,
        reason: data.reason || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability/week"] });
      setExDate("");
      setExReason("");
      toast({ title: isEs ? "Fecha bloqueada" : "Date blocked" });
    },
  });

  // Build the effective slot state (base data + user toggles)
  const getSlotKey = (dayOfWeek: number, time: string) => `${dayOfWeek}-${time}`;

  const isSlotActive = (dayOfWeek: number, time: string, baseAvailable: boolean) => {
    const key = getSlotKey(dayOfWeek, time);
    if (toggledSlots.has(key)) return toggledSlots.get(key)!;
    return baseAvailable;
  };

  const toggleSlot = (dayOfWeek: number, time: string, currentState: boolean) => {
    const key = getSlotKey(dayOfWeek, time);
    setToggledSlots(prev => {
      const next = new Map(prev);
      next.set(key, !currentState);
      return next;
    });
    setIsDirty(true);
  };

  // Convert the toggled state to recurring slots for saving
  const handleSave = useCallback(() => {
    if (!weekData) return;

    const slotsByDay = new Map<number, Set<string>>();

    // Initialize from existing recurring data
    for (const rs of weekData.recurringSlots) {
      if (!slotsByDay.has(rs.dayOfWeek)) slotsByDay.set(rs.dayOfWeek, new Set());
      const [sh, sm] = rs.startTime.split(":").map(Number);
      const [eh, em] = rs.endTime.split(":").map(Number);
      for (let t = sh * 60 + sm; t < eh * 60 + em; t += 30) {
        const timeStr = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
        slotsByDay.get(rs.dayOfWeek)!.add(timeStr);
      }
    }

    // Apply toggles
    Array.from(toggledSlots.entries()).forEach(([key, val]) => {
      const dashIdx = key.indexOf("-");
      const dayOfWeek = parseInt(key.substring(0, dashIdx));
      const timeStr = key.substring(dashIdx + 1);

      if (!slotsByDay.has(dayOfWeek)) slotsByDay.set(dayOfWeek, new Set());
      if (val) {
        slotsByDay.get(dayOfWeek)!.add(timeStr);
      } else {
        slotsByDay.get(dayOfWeek)!.delete(timeStr);
      }
    });

    // Convert to contiguous time ranges
    const newSlots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
    Array.from(slotsByDay.entries()).forEach(([dayOfWeek, times]) => {
      const sorted = Array.from(times).sort();
      if (sorted.length === 0) return;

      let rangeStart: string = sorted[0];
      let lastTime: string = sorted[0];

      for (let i = 1; i <= sorted.length; i++) {
        const current: string | undefined = sorted[i];
        const lastMinutes = parseInt(lastTime.split(":")[0]) * 60 + parseInt(lastTime.split(":")[1]);
        const currentMinutes = current ? parseInt(current.split(":")[0]) * 60 + parseInt(current.split(":")[1]) : -1;

        if (currentMinutes !== lastMinutes + 30) {
          const endMinutes = lastMinutes + 30;
          const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
          newSlots.push({ dayOfWeek, startTime: rangeStart, endTime });
          if (current) rangeStart = current;
        }
        if (current) lastTime = current;
      }
    });

    saveMutation.mutate(newSlots);
  }, [weekData, toggledSlots, saveMutation]);

  // Time labels (6:00 to 21:30)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 6; h < 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  }, []);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {isEs ? "Mi Disponibilidad" : "My Availability"}
          </h2>
          <p className="text-sm text-foreground/60">
            {isEs ? "Haz clic en las celdas para activar/desactivar horarios" : "Click cells to toggle time slots"}
          </p>
        </div>
        <div className="flex gap-2">
          {showBackButton && (
            <Button variant="outline" size="sm" onClick={() => setLocation("/tutor-portal")}>
              {isEs ? "Volver" : "Back"}
            </Button>
          )}
          {isDirty && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {isEs ? "Guardar" : "Save"}
            </Button>
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => { setWeekOffset(w => w - 1); setToggledSlots(new Map()); setIsDirty(false); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {weekData ? (() => {
              const start = new Date(weekData.weekStart + "T12:00:00");
              const end = new Date(start);
              end.setDate(end.getDate() + 6);
              return `${start.toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric" })} — ${end.toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" })}`;
            })() : "..."}
          </span>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => { setWeekOffset(0); setToggledSlots(new Map()); setIsDirty(false); }}>
              {isEs ? "Hoy" : "Today"}
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setWeekOffset(w => w + 1); setToggledSlots(new Map()); setIsDirty(false); }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success/15 border border-green-300" /> {isEs ? "Disponible" : "Available"}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary" /> {isEs ? "Clase reservada" : "Booked class"}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-destructive/15 border border-red-300" /> {isEs ? "Bloqueado" : "Blocked"}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-card border border-border" /> {isEs ? "No disponible" : "Not available"}</span>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      ) : weekData ? (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="w-16 p-2 text-[10px] text-muted-foreground font-medium text-right border-b border-border">
                    <Clock className="h-3 w-3 inline" />
                  </th>
                  {DAY_ORDER.map(dow => {
                    const dayData = weekData.days.find(d => d.dayOfWeek === dow);
                    const isToday = dayData?.date === today;
                    return (
                      <th
                        key={dow}
                        className={`p-2 text-center border-b border-border ${isToday ? "bg-muted" : ""}`}
                      >
                        <p className={`text-xs font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                          {dayNames[dow]}
                        </p>
                        {dayData && (
                          <p className={`text-[10px] ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                            {new Date(dayData.date + "T12:00:00").getDate()}
                          </p>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time, timeIdx) => (
                  <tr key={time} className={timeIdx % 2 === 0 ? "" : "bg-muted/40/30"}>
                    <td className="p-0 pr-2 text-right">
                      {timeIdx % 2 === 0 && (
                        <span className="text-[10px] text-muted-foreground">{time}</span>
                      )}
                    </td>
                    {DAY_ORDER.map(dow => {
                      const dayData = weekData.days.find(d => d.dayOfWeek === dow);
                      const slot = dayData?.slots.find(s => s.time === time);
                      if (!slot) return <td key={dow} className="p-0.5"><div className="h-6" /></td>;

                      const isToday = dayData?.date === today;
                      const effectiveAvailable = isSlotActive(dow, time, slot.isRecurring);

                      let cellClass = "h-6 rounded-sm cursor-pointer transition-all text-[8px] flex items-center justify-center ";

                      if (slot.booked) {
                        cellClass += "bg-primary text-primary-foreground cursor-default";
                      } else if (slot.blocked) {
                        cellClass += "bg-destructive/15 border border-destructive/30 text-red-400 cursor-default";
                      } else if (effectiveAvailable) {
                        cellClass += "bg-success/15 border border-success/30 hover:bg-green-200";
                      } else {
                        cellClass += "bg-card border border-border hover:bg-muted";
                      }

                      if (isToday && !slot.booked && !slot.blocked) {
                        cellClass += " ring-1 ring-primary/20";
                      }

                      const content = slot.booked ? (slot.classInfo?.split(" · ")[0] || "") : "";

                      return (
                        <td key={dow} className="p-0.5">
                          <div
                            className={cellClass}
                            onClick={() => {
                              if (slot.booked || slot.blocked) return;
                              toggleSlot(dow, time, effectiveAvailable);
                            }}
                            title={slot.booked ? slot.classInfo : slot.blocked ? (isEs ? "Bloqueado" : "Blocked") : time}
                          >
                            {slot.booked && <User className="h-2.5 w-2.5 mr-0.5" />}
                            {slot.booked && <span className="truncate max-w-[60px]">{content}</span>}
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
      ) : isError ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 bg-destructive/10 rounded-full mx-auto mb-3 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-sm text-foreground/70 mb-3">
              {isEs ? "No se pudo cargar el calendario. Intenta de nuevo." : "Could not load calendar. Please try again."}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {isEs ? "Reintentar" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Block Date Section */}
      <Card className="border-0 shadow-sm mt-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Ban className="h-4 w-4 text-destructive" />
            {isEs ? "Bloquear Fecha" : "Block Date"}
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">{isEs ? "Fecha" : "Date"}</Label>
              <Input
                type="date"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
                className="w-40 h-8 text-xs"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[150px]">
              <Label className="text-xs">{isEs ? "Razón (opcional)" : "Reason (optional)"}</Label>
              <Input
                value={exReason}
                onChange={(e) => setExReason(e.target.value)}
                placeholder={isEs ? "Ej: Vacaciones" : "E.g. Vacation"}
                className="h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8"
              disabled={!exDate || addExceptionMutation.isPending}
              onClick={() => addExceptionMutation.mutate({ date: exDate, reason: exReason })}
            >
              <Ban className="h-3.5 w-3.5 mr-1" />
              {isEs ? "Bloquear" : "Block"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
