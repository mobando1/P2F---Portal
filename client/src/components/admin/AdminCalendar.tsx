import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import {
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Video,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { es, enUS } from "date-fns/locale";

interface CalendarEvent {
  id: number;
  title: string;
  scheduledAt: string;
  duration: number;
  status: string;
  tutorId: number;
  tutorName: string;
  tutorColor: string;
  studentName: string;
  meetingLink: string | null;
  isTrial: boolean;
}

interface TutorInfo {
  id: number;
  name: string;
  color: string;
}

interface CalendarData {
  events: CalendarEvent[];
  tutors: TutorInfo[];
}

export default function AdminCalendar() {
  const { language } = useLanguage();
  const isEs = language === "es";
  const locale = isEs ? es : enUS;
  const [view, setView] = useState<"calendar" | "agenda">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterTutor, setFilterTutor] = useState<number | "all">("all");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data, isLoading } = useQuery<CalendarData>({
    queryKey: ["/api/admin/calendar", monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/admin/calendar?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`
      ).then((r) => r.json()),
  });

  const events = data?.events || [];
  const tutors = data?.tutors || [];

  const filteredEvents = useMemo(() => {
    if (filterTutor === "all") return events;
    return events.filter((e) => e.tutorId === filterTutor);
  }, [events, filterTutor]);

  // Calendar grid
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsForDay = (day: Date) =>
    filteredEvents.filter((e) => isSameDay(new Date(e.scheduledAt), day));

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const statusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700 text-[10px]">{isEs ? "Prog." : "Sched."}</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-700 text-[10px]">{isEs ? "Comp." : "Done"}</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 text-[10px]">{isEs ? "Canc." : "Canc."}</Badge>;
      default:
        return null;
    }
  };

  // Agenda: group events by date
  const agendaEvents = useMemo(() => {
    const sorted = [...filteredEvents]
      .filter((e) => e.status !== "cancelled")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const grouped = new Map<string, CalendarEvent[]>();
    sorted.forEach((e) => {
      const dateKey = format(new Date(e.scheduledAt), "yyyy-MM-dd");
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(e);
    });
    return grouped;
  }, [filteredEvents]);

  const weekDays = isEs
    ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-400">
          {isEs ? "Cargando calendario..." : "Loading calendar..."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: view toggle + tutor filter + month nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={view === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("calendar")}
            className={view === "calendar" ? "bg-[#1C7BB1]" : ""}
          >
            <CalendarDays className="w-4 h-4 mr-1" />
            {isEs ? "Mensual" : "Monthly"}
          </Button>
          <Button
            variant={view === "agenda" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("agenda")}
            className={view === "agenda" ? "bg-[#1C7BB1]" : ""}
          >
            <List className="w-4 h-4 mr-1" />
            {isEs ? "Agenda" : "Agenda"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Tutor filter */}
          <select
            value={filterTutor === "all" ? "all" : filterTutor.toString()}
            onChange={(e) =>
              setFilterTutor(e.target.value === "all" ? "all" : parseInt(e.target.value))
            }
            className="text-sm border rounded-md px-2 py-1.5 text-gray-700"
          >
            <option value="all">{isEs ? "Todos los profes" : "All tutors"}</option>
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Month navigation */}
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              {/* Week day headers */}
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                    {d}
                  </div>
                ))}
              </div>
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                {calendarDays.map((day) => {
                  const dayEvents = eventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const isCurrentMonth = isSameMonth(day, currentMonth);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={`bg-white min-h-[80px] p-1 text-left transition-colors hover:bg-blue-50 ${
                        !isCurrentMonth ? "opacity-40" : ""
                      } ${isSelected ? "ring-2 ring-[#1C7BB1] ring-inset" : ""}`}
                    >
                      <div
                        className={`text-xs font-medium mb-1 ${
                          isToday
                            ? "bg-[#1C7BB1] text-white w-5 h-5 rounded-full flex items-center justify-center"
                            : "text-gray-700"
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className="text-[9px] leading-tight px-1 py-0.5 rounded truncate"
                            style={{ backgroundColor: e.tutorColor + "20", color: e.tutorColor }}
                          >
                            {format(new Date(e.scheduledAt), "HH:mm")} {e.tutorName.split(" ")[0]}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] text-gray-400 px-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day detail panel */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#0A4A6E] mb-3">
                {selectedDay
                  ? format(selectedDay, "EEEE, d MMM", { locale })
                  : isEs
                    ? "Selecciona un día"
                    : "Select a day"}
              </h3>
              {selectedDay && selectedDayEvents.length === 0 && (
                <p className="text-sm text-gray-400 py-8 text-center">
                  {isEs ? "Sin clases este día" : "No classes this day"}
                </p>
              )}
              <div className="space-y-3">
                {selectedDayEvents.map((e) => (
                  <div key={e.id} className="p-3 rounded-lg border" style={{ borderLeftWidth: 3, borderLeftColor: e.tutorColor }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: e.tutorColor }}>
                        {e.tutorName}
                      </span>
                      {statusBadge(e.status)}
                    </div>
                    <div className="text-sm font-medium text-gray-800">{e.title}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(e.scheduledAt), "HH:mm")} - {e.duration}min
                      </span>
                      <span>{e.studentName}</span>
                    </div>
                    {e.isTrial && (
                      <Badge className="mt-1 bg-amber-100 text-amber-700 text-[10px]">Trial</Badge>
                    )}
                    {e.meetingLink && e.status === "scheduled" && (
                      <a
                        href={e.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-xs text-[#1C7BB1] hover:underline"
                      >
                        <Video className="w-3 h-3" />
                        {isEs ? "Unirse" : "Join"}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agenda View */}
      {view === "agenda" && (
        <Card>
          <CardContent className="p-4">
            {agendaEvents.size === 0 && (
              <p className="text-center text-gray-400 py-12">
                {isEs ? "Sin clases este mes" : "No classes this month"}
              </p>
            )}
            <div className="space-y-6">
              {Array.from(agendaEvents.entries()).map(([dateKey, dayEvents]) => (
                <div key={dateKey}>
                  <h4 className="text-sm font-semibold text-[#0A4A6E] mb-2 capitalize">
                    {format(new Date(dateKey), "EEEE, d MMMM", { locale })}
                  </h4>
                  <div className="space-y-2">
                    {dayEvents.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                        style={{ borderLeftWidth: 3, borderLeftColor: e.tutorColor }}
                      >
                        <div className="text-sm font-mono text-gray-600 w-12">
                          {format(new Date(e.scheduledAt), "HH:mm")}
                        </div>
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: e.tutorColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{e.title}</div>
                          <div className="text-xs text-gray-500">
                            {e.tutorName} &middot; {e.studentName} &middot; {e.duration}min
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {e.isTrial && (
                            <Badge className="bg-amber-100 text-amber-700 text-[10px]">Trial</Badge>
                          )}
                          {statusBadge(e.status)}
                          {e.meetingLink && e.status === "scheduled" && (
                            <a
                              href={e.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#1C7BB1] hover:bg-blue-50 p-1 rounded"
                            >
                              <Video className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tutor Legend */}
      <div className="flex flex-wrap gap-3">
        {tutors.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterTutor(filterTutor === t.id ? "all" : t.id)}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
              filterTutor === t.id ? "ring-2 ring-offset-1" : ""
            }`}
            style={{
              borderColor: t.color,
              backgroundColor: filterTutor === t.id ? t.color + "15" : "transparent",
              // @ts-expect-error CSS custom property for ring color
              "--tw-ring-color": t.color,
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
