import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Clock, Calendar } from "lucide-react";
import WeeklyScheduleEditor from "./WeeklyScheduleEditor";
import CalendarView from "./CalendarView";

interface TutorAvailabilityManagerProps {
  showBackButton?: boolean;
  className?: string;
}

export default function TutorAvailabilityManager({ showBackButton, className }: TutorAvailabilityManagerProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [activeTab, setActiveTab] = useState<"schedule" | "calendar">("schedule");

  return (
    <div className={className}>
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">
          {isEs ? "Mi Disponibilidad" : "My Availability"}
        </h2>
        {showBackButton && (
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            {isEs ? "Volver" : "Back"}
          </Button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-6 bg-card rounded-xl p-1 shadow-sm border border-border">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 rounded-lg transition-all ${
            activeTab === "schedule"
              ? "bg-primary text-primary-foreground hover:bg-primary-900 shadow-sm"
              : "text-foreground/60 hover:text-foreground hover:bg-muted/40"
          }`}
          onClick={() => setActiveTab("schedule")}
        >
          <Clock className="h-4 w-4 mr-1.5" />
          <span className="text-xs sm:text-sm">{isEs ? "Horario Semanal" : "Weekly Schedule"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 rounded-lg transition-all ${
            activeTab === "calendar"
              ? "bg-primary text-primary-foreground hover:bg-primary-900 shadow-sm"
              : "text-foreground/60 hover:text-foreground hover:bg-muted/40"
          }`}
          onClick={() => setActiveTab("calendar")}
        >
          <Calendar className="h-4 w-4 mr-1.5" />
          <span className="text-xs sm:text-sm">{isEs ? "Calendario" : "Calendar"}</span>
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "schedule" && <WeeklyScheduleEditor />}
      {activeTab === "calendar" && <CalendarView />}
    </div>
  );
}
