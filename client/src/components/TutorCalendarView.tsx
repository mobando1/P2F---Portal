import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import {
  ChevronLeft,
  ChevronRight,
  Video,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

interface CalendarClass {
  id: number;
  title: string;
  scheduledAt: string;
  duration: number;
  status: string;
  meetingLink?: string;
  studentName?: string;
}

interface Props {
  classes: CalendarClass[];
  onCompleteClass?: (classId: number, studentName: string) => void;
}

const DAY_NAMES_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function TutorCalendarView({ classes, onCompleteClass }: Props) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const dayNames = isEs ? DAY_NAMES_ES : DAY_NAMES_EN;
  const monthNames = isEs ? MONTH_NAMES_ES : MONTH_NAMES_EN;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split("T")[0]);

  // Group classes by date
  const classesByDate = useMemo(() => {
    const map = new Map<string, CalendarClass[]>();
    classes.forEach(c => {
      const date = new Date(c.scheduledAt).toISOString().split("T")[0];
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(c);
    });
    return map;
  }, [classes]);

  // Calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const selectedClasses = selectedDate
    ? (classesByDate.get(selectedDate) || []).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    : [];

  const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
    scheduled: { icon: Clock, color: "text-[#1C7BB1]", bg: "bg-[#1C7BB1]", label: isEs ? "Programada" : "Scheduled" },
    completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-500", label: isEs ? "Completada" : "Completed" },
    cancelled: { icon: XCircle, color: "text-gray-400", bg: "bg-gray-400", label: isEs ? "Cancelada" : "Cancelled" },
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 md:p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold text-[#0A4A6E]">
            {monthNames[month]} {year}
          </h3>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-[#0A4A6E]/50 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayClasses = classesByDate.get(dateStr) || [];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const hasScheduled = dayClasses.some(c => c.status === "scheduled");
            const hasCompleted = dayClasses.some(c => c.status === "completed");

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-10 rounded-lg flex flex-col items-center justify-center relative transition-all ${
                  isSelected
                    ? "bg-[#1C7BB1] text-white"
                    : isToday
                    ? "bg-[#EAF4FA] text-[#0A4A6E] font-bold"
                    : "hover:bg-gray-50 text-[#0A4A6E]"
                }`}
              >
                <span className="text-xs">{day}</span>
                {dayClasses.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasScheduled && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#1C7BB1]"}`} />}
                    {hasCompleted && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/60" : "bg-green-500"}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Detail */}
        {selectedDate && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-[#0A4A6E]/60 mb-2">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString(isEs ? "es-ES" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>

            {selectedClasses.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">
                {isEs ? "Sin clases este día" : "No classes this day"}
              </p>
            ) : (
              <div className="space-y-2">
                {selectedClasses.map(c => {
                  const config = statusConfig[c.status] || statusConfig.scheduled;
                  const StatusIcon = config.icon;
                  const time = new Date(c.scheduledAt).toLocaleTimeString(isEs ? "es-ES" : "en-US", { hour: "numeric", minute: "2-digit" });

                  return (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <div className={`w-1 h-8 rounded-full ${config.bg} flex-shrink-0`} />
                      <StatusIcon className={`h-3.5 w-3.5 ${config.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#0A4A6E] truncate">{c.studentName || c.title}</p>
                        <p className="text-[10px] text-gray-500">{time} · {c.duration} min</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {c.meetingLink && c.status === "scheduled" && (
                          <a href={c.meetingLink} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="h-6 text-[10px] bg-green-600 hover:bg-green-700 px-2">
                              <Video className="h-3 w-3 mr-0.5" /> Join
                            </Button>
                          </a>
                        )}
                        {c.status === "scheduled" && onCompleteClass && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] text-green-600 border-green-200 px-2"
                            onClick={() => onCompleteClass(c.id, c.studentName || "Student")}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
