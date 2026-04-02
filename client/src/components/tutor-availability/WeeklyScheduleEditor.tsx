import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Save, Loader2, RotateCcw, Clock, Briefcase } from "lucide-react";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_FULL_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_FULL_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const START_HOUR = 8;
const END_HOUR = 20;

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

interface RecurringSlot {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export default function WeeklyScheduleEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const isEs = language === "es";
  const dayNames = isEs ? DAY_NAMES_ES : DAY_NAMES_EN;
  const dayFull = isEs ? DAY_FULL_ES : DAY_FULL_EN;

  const timeSlots = useMemo(generateTimeSlots, []);

  // Grid state: Map<"dayOfWeek-HH:MM", boolean>
  const [cells, setCells] = useState<Map<string, boolean>>(new Map());
  const [isDirty, setIsDirty] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Drag-to-paint state
  const paintingRef = useRef<{ active: boolean; paintValue: boolean }>({ active: false, paintValue: false });

  // Mobile: expanded day
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Load recurring availability
  const { data: recurringSlots, isLoading } = useQuery<RecurringSlot[]>({
    queryKey: ["/api/tutor/availability"],
    queryFn: () => apiRequest("GET", "/api/tutor/availability").then(r => r.json()),
  });

  // Initialize cells from recurring data (once)
  useMemo(() => {
    if (!recurringSlots || initialized) return;
    const map = new Map<string, boolean>();
    for (const slot of recurringSlots) {
      const [sh, sm] = (slot.startTime || "00:00").split(":").map(Number);
      const [eh, em] = (slot.endTime || "00:00").split(":").map(Number);
      for (let t = sh * 60 + sm; t < eh * 60 + em; t += 30) {
        const h = Math.floor(t / 60);
        const m = t % 60;
        if (h >= START_HOUR && h < END_HOUR) {
          const key = `${slot.dayOfWeek}-${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          map.set(key, true);
        }
      }
    }
    setCells(map);
    setInitialized(true);
  }, [recurringSlots, initialized]);

  const saveMutation = useMutation({
    mutationFn: async (slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) => {
      const res = await apiRequest("PUT", "/api/tutor/availability", { slots });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability/week"] });
      setIsDirty(false);
      toast({ title: isEs ? "Horario guardado" : "Schedule saved" });
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  });

  const cellKey = (dow: number, time: string) => `${dow}-${time}`;
  const isCellActive = (dow: number, time: string) => cells.get(cellKey(dow, time)) || false;

  const toggleCell = useCallback((dow: number, time: string, value: boolean) => {
    setCells(prev => {
      const next = new Map(prev);
      next.set(cellKey(dow, time), value);
      return next;
    });
    setIsDirty(true);
  }, []);

  // Drag-to-paint handlers
  const onPointerDown = useCallback((dow: number, time: string) => {
    const current = isCellActive(dow, time);
    paintingRef.current = { active: true, paintValue: !current };
    toggleCell(dow, time, !current);
  }, [cells, toggleCell]);

  const onPointerEnter = useCallback((dow: number, time: string) => {
    if (paintingRef.current.active) {
      toggleCell(dow, time, paintingRef.current.paintValue);
    }
  }, [toggleCell]);

  const onPointerUp = useCallback(() => {
    paintingRef.current.active = false;
  }, []);

  // Quick presets
  const applyPreset = useCallback((preset: "weekday9to5" | "clear") => {
    const map = new Map<string, boolean>();
    if (preset === "weekday9to5") {
      for (const dow of [1, 2, 3, 4, 5]) { // Mon-Fri
        for (const time of timeSlots) {
          const h = parseInt(time.split(":")[0]);
          if (h >= 9 && h < 17) {
            map.set(cellKey(dow, time), true);
          }
        }
      }
    }
    setCells(map);
    setIsDirty(true);
  }, [timeSlots]);

  // Save: merge cells into contiguous ranges
  const handleSave = useCallback(() => {
    const slotsByDay = new Map<number, string[]>();
    cells.forEach((active, key) => {
      if (!active) return;
      const dashIdx = key.indexOf("-");
      const dow = parseInt(key.substring(0, dashIdx));
      const time = key.substring(dashIdx + 1);
      if (!slotsByDay.has(dow)) slotsByDay.set(dow, []);
      slotsByDay.get(dow)!.push(time);
    });

    const newSlots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
    slotsByDay.forEach((times, dow) => {
      const sorted = times.sort();
      if (sorted.length === 0) return;
      let rangeStart = sorted[0];
      let lastTime = sorted[0];
      for (let i = 1; i <= sorted.length; i++) {
        const current = sorted[i];
        const lastMin = parseInt(lastTime.split(":")[0]) * 60 + parseInt(lastTime.split(":")[1]);
        const curMin = current ? parseInt(current.split(":")[0]) * 60 + parseInt(current.split(":")[1]) : -1;
        if (curMin !== lastMin + 30) {
          const endMin = lastMin + 30;
          const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
          newSlots.push({ dayOfWeek: dow, startTime: rangeStart, endTime });
          if (current) rangeStart = current;
        }
        if (current) lastTime = current;
      }
    });

    saveMutation.mutate(newSlots);
  }, [cells, saveMutation]);

  // Count active slots per day for summary
  const daySummary = useMemo(() => {
    const counts = new Map<number, number>();
    cells.forEach((active, key) => {
      if (!active) return;
      const dow = parseInt(key.split("-")[0]);
      counts.set(dow, (counts.get(dow) || 0) + 1);
    });
    return counts;
  }, [cells]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-[#1C7BB1]" />
      </div>
    );
  }

  return (
    <div onPointerUp={onPointerUp} className="select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0A4A6E]">
            {isEs ? "Horario Semanal" : "Weekly Schedule"}
          </h3>
          <p className="text-xs text-[#0A4A6E]/60">
            {isEs
              ? "Define tu disponibilidad recurrente. Arrastra para seleccionar múltiples horarios."
              : "Set your recurring availability. Drag to select multiple slots."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => applyPreset("weekday9to5")}
          >
            <Briefcase className="h-3.5 w-3.5 mr-1" />
            {isEs ? "Lun-Vie 9-5" : "Mon-Fri 9-5"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => applyPreset("clear")}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {isEs ? "Limpiar" : "Clear"}
          </Button>
        </div>
      </div>

      {/* Desktop Grid */}
      <Card className="border-0 shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-14 p-2 text-right border-b border-gray-100">
                  <Clock className="h-3 w-3 inline text-gray-400" />
                </th>
                {DAY_ORDER.map(dow => {
                  const count = daySummary.get(dow) || 0;
                  const hours = (count * 30 / 60).toFixed(1);
                  return (
                    <th key={dow} className="p-2 text-center border-b border-gray-100">
                      <p className="text-xs font-semibold text-[#0A4A6E]">{dayNames[dow]}</p>
                      {count > 0 && (
                        <p className="text-[9px] text-green-600">{hours}h</p>
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
                    {idx % 2 === 0 && (
                      <span className="text-[10px] text-gray-400">{time}</span>
                    )}
                  </td>
                  {DAY_ORDER.map(dow => {
                    const active = isCellActive(dow, time);
                    return (
                      <td key={dow} className="p-0.5">
                        <div
                          className={`h-5 rounded-sm cursor-pointer transition-colors touch-none ${
                            active
                              ? "bg-green-200 border border-green-300 hover:bg-green-300"
                              : "bg-white border border-gray-100 hover:bg-gray-100"
                          }`}
                          onPointerDown={(e) => { e.preventDefault(); onPointerDown(dow, time); }}
                          onPointerEnter={() => onPointerEnter(dow, time)}
                          title={`${dayNames[dow]} ${time}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile: Day-by-day collapsible */}
      <div className="md:hidden space-y-2">
        {DAY_ORDER.map(dow => {
          const count = daySummary.get(dow) || 0;
          const hours = (count * 30 / 60).toFixed(1);
          const isExpanded = expandedDay === dow;
          return (
            <Card key={dow} className="border-0 shadow-sm">
              <button
                className="w-full p-3 flex items-center justify-between text-left"
                onClick={() => setExpandedDay(isExpanded ? null : dow)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#0A4A6E]">{dayFull[dow]}</span>
                  {count > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      {hours}h
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{isExpanded ? "▲" : "▼"}</span>
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 grid grid-cols-4 gap-1">
                  {timeSlots.map(time => {
                    const active = isCellActive(dow, time);
                    return (
                      <button
                        key={time}
                        className={`py-1.5 rounded text-xs font-medium transition-colors ${
                          active
                            ? "bg-green-200 text-green-800 border border-green-300"
                            : "bg-gray-50 text-gray-400 border border-gray-100"
                        }`}
                        onClick={() => toggleCell(dow, time, !active)}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Save bar */}
      {isDirty && (
        <div className="sticky bottom-4 mt-4 flex justify-center">
          <Button
            className="bg-green-600 hover:bg-green-700 shadow-lg px-6"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEs ? "Guardar Horario" : "Save Schedule"}
          </Button>
        </div>
      )}
    </div>
  );
}
