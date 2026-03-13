import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Ban,
} from "lucide-react";

interface AvailabilitySlot {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface AvailabilityException {
  id: number;
  date: string;
  isBlocked: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

const DAY_NAMES_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_NAMES_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TutorAvailability() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const { language } = useLanguage();

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  // Exception form state
  const [exDate, setExDate] = useState("");
  const [exReason, setExReason] = useState("");

  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  if (user.userType !== "tutor" && user.userType !== "admin") {
    setLocation("/home");
    return null;
  }

  const dayNames = language === "es" ? DAY_NAMES_ES : DAY_NAMES_EN;

  const { isLoading } = useQuery<AvailabilitySlot[]>({
    queryKey: ["/api/tutor/availability"],
    select: (data: any) => {
      if (!slotsLoaded && Array.isArray(data)) {
        setSlots(data.map((s: any) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime || "09:00",
          endTime: s.endTime || "17:00",
        })));
        setSlotsLoaded(true);
      }
      return data;
    },
  });

  const { data: exceptions } = useQuery<AvailabilityException[]>({
    queryKey: ["/api/tutor/profile"],
    enabled: false, // exceptions come from a separate call; we'll use the tutor profile query for now
  });

  const saveMutation = useMutation({
    mutationFn: async (newSlots: AvailabilitySlot[]) => {
      const response = await apiRequest("PUT", "/api/tutor/availability", { slots: newSlots });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability"] });
      toast({
        title: language === "es" ? "Guardado" : "Saved",
        description: language === "es" ? "Tu disponibilidad ha sido actualizada." : "Your availability has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: language === "es" ? "No se pudo guardar." : "Could not save.",
        variant: "destructive",
      });
    },
  });

  const addExceptionMutation = useMutation({
    mutationFn: async (data: { date: string; reason: string }) => {
      const response = await apiRequest("POST", "/api/tutor/availability/exception", {
        date: data.date,
        isBlocked: true,
        reason: data.reason || null,
      });
      return response.json();
    },
    onSuccess: () => {
      setExDate("");
      setExReason("");
      toast({
        title: language === "es" ? "Excepción agregada" : "Exception added",
        description: language === "es" ? "El día ha sido bloqueado." : "The day has been blocked.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: language === "es" ? "No se pudo agregar la excepción." : "Could not add exception.",
        variant: "destructive",
      });
    },
  });

  const addSlot = (dayOfWeek: number) => {
    setSlots((prev) => [...prev, { dayOfWeek, startTime: "09:00", endTime: "10:00" }]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: "startTime" | "endTime", value: string) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleSave = () => {
    saveMutation.mutate(slots);
  };

  const handleAddException = () => {
    if (!exDate) return;
    addExceptionMutation.mutate({ date: exDate, reason: exReason });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-1/3 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Group slots by day
  const slotsByDay: Record<number, { slot: AvailabilitySlot; index: number }[]> = {};
  slots.forEach((slot, index) => {
    if (!slotsByDay[slot.dayOfWeek]) slotsByDay[slot.dayOfWeek] = [];
    slotsByDay[slot.dayOfWeek].push({ slot, index });
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/tutor-portal")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {language === "es" ? "Volver" : "Back"}
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-[#0A4A6E]">
              {language === "es" ? "Gestionar Disponibilidad" : "Manage Availability"}
            </h1>
            <p className="text-[#0A4A6E]/70 mt-1">
              {language === "es"
                ? "Configura tus horarios semanales recurrentes"
                : "Configure your recurring weekly schedule"}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending
              ? (language === "es" ? "Guardando..." : "Saving...")
              : (language === "es" ? "Guardar" : "Save")}
          </Button>
        </motion.div>

        {/* Weekly Schedule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
            // dayOfWeek: 0=Sunday...6=Saturday  → display index for labels
            const labelIndex = dayNum === 0 ? 6 : dayNum - 1;
            const daySlots = slotsByDay[dayNum] || [];
            const isWeekend = dayNum === 0 || dayNum === 6;

            return (
              <Card
                key={dayNum}
                className={`border ${isWeekend ? "border-dashed border-gray-300" : "border-[#1C7BB1]/20"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold ${isWeekend ? "text-gray-500" : "text-[#0A4A6E]"}`}>
                      {dayNames[labelIndex]}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addSlot(dayNum)}
                      className="text-[#1C7BB1] hover:bg-[#EAF4FA]"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {language === "es" ? "Agregar" : "Add"}
                    </Button>
                  </div>

                  {daySlots.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      {language === "es" ? "Sin disponibilidad" : "No availability"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map(({ slot, index }) => (
                        <div key={index} className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#1C7BB1] flex-shrink-0" />
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                            className="h-8 text-sm w-28"
                          />
                          <span className="text-gray-400">-</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                            className="h-8 text-sm w-28"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSlot(index)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Block Specific Date */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Ban className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-semibold text-[#0A4A6E]">
                {language === "es" ? "Bloquear Día (Vacación/Excepción)" : "Block Day (Vacation/Exception)"}
              </h2>
            </div>
            <p className="text-sm text-[#0A4A6E]/60 mb-4">
              {language === "es"
                ? "Bloquea una fecha específica para que los estudiantes no puedan agendar."
                : "Block a specific date so students cannot book."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label className="text-sm text-[#0A4A6E]">
                  {language === "es" ? "Fecha" : "Date"}
                </Label>
                <Input
                  type="date"
                  value={exDate}
                  onChange={(e) => setExDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-[#0A4A6E]">
                  {language === "es" ? "Razón (opcional)" : "Reason (optional)"}
                </Label>
                <Input
                  value={exReason}
                  onChange={(e) => setExReason(e.target.value)}
                  placeholder={language === "es" ? "Ej: Vacaciones" : "E.g.: Vacation"}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleAddException}
                disabled={!exDate || addExceptionMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Ban className="h-4 w-4 mr-2" />
                {language === "es" ? "Bloquear" : "Block"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
