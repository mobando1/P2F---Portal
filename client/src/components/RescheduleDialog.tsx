import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Loader2 } from "lucide-react";

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number;
  tutorId: number;
  tutorName: string;
  currentDate: string;
}

export default function RescheduleDialog({
  open,
  onOpenChange,
  classId,
  tutorId,
  tutorName,
  currentDate,
}: RescheduleDialogProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEs = language === "es";

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Get available time slots for selected date
  const { data: slots, isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/calendar/tutor/${tutorId}/availability`, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/tutor/${tutorId}/availability?date=${selectedDate}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedDate,
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !selectedDate) throw new Error("Missing data");
      const newScheduledAt = `${selectedDate}T${selectedSlot}`;
      const response = await apiRequest("PUT", `/api/classes/${classId}/reschedule`, {
        newScheduledAt,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: isEs ? "Clase reagendada" : "Class rescheduled",
        description: isEs ? "Tu clase ha sido reagendada exitosamente." : "Your class has been rescheduled successfully.",
      });
      onOpenChange(false);
      setSelectedDate("");
      setSelectedSlot(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || (isEs ? "No se pudo reagendar." : "Could not reschedule."),
        variant: "destructive",
      });
    },
  });

  const availableSlots = (slots || []).filter(s => s.available);

  // Min date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0A4A6E]">
            {isEs ? "Reagendar Clase" : "Reschedule Class"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current date info */}
          <div className="bg-[#EAF4FA] p-3 rounded-lg text-sm">
            <p className="text-[#0A4A6E]">
              <strong>{isEs ? "Profesor:" : "Tutor:"}</strong> {tutorName}
            </p>
            <p className="text-[#0A4A6E]/70">
              <strong>{isEs ? "Fecha actual:" : "Current date:"}</strong>{" "}
              {new Date(currentDate).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Date picker */}
          <div>
            <Label className="text-sm text-[#0A4A6E] flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {isEs ? "Nueva Fecha" : "New Date"}
            </Label>
            <Input
              type="date"
              min={minDate}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
              className="mt-1"
            />
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <Label className="text-sm text-[#0A4A6E] flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                {isEs ? "Horarios Disponibles" : "Available Times"}
              </Label>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-[#1C7BB1]" />
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  {isEs ? "No hay horarios disponibles para esta fecha" : "No available times for this date"}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      variant={selectedSlot === slot.startTime ? "default" : "outline"}
                      size="sm"
                      className={
                        selectedSlot === slot.startTime
                          ? "bg-[#1C7BB1] text-white"
                          : "border-[#1C7BB1]/30 text-[#0A4A6E] hover:bg-[#EAF4FA]"
                      }
                      onClick={() => setSelectedSlot(slot.startTime)}
                    >
                      {slot.startTime}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {isEs ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              className="flex-1 bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
              disabled={!selectedDate || !selectedSlot || rescheduleMutation.isPending}
              onClick={() => rescheduleMutation.mutate()}
            >
              {rescheduleMutation.isPending
                ? (isEs ? "Reagendando..." : "Rescheduling...")
                : (isEs ? "Confirmar" : "Confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
