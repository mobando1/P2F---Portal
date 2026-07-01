import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Ban, Loader2, Calendar, Clock, Repeat } from "lucide-react";

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function generateTimeOptions(): string[] {
  const opts: string[] = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
}

interface BlockTimeDialogProps {
  open: boolean;
  onClose: () => void;
  prefillDate?: string; // YYYY-MM-DD
  prefillTime?: string; // HH:MM
}

type BlockMode = "full_day" | "time_range" | "recurring";

export default function BlockTimeDialog({ open, onClose, prefillDate, prefillTime }: BlockTimeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const isEs = language === "es";
  const timeOptions = useMemo(generateTimeOptions, []);

  const [mode, setMode] = useState<BlockMode>("time_range");
  const [date, setDate] = useState(prefillDate || "");
  const [startTime, setStartTime] = useState(prefillTime || "09:00");
  const [endTime, setEndTime] = useState(() => {
    if (prefillTime) {
      const [h, m] = prefillTime.split(":").map(Number);
      const endMin = h * 60 + m + 60;
      return `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    }
    return "10:00";
  });
  const [reason, setReason] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [numWeeks, setNumWeeks] = useState("2");

  // Reset when dialog opens with new prefills
  useState(() => {
    if (prefillDate) setDate(prefillDate);
    if (prefillTime) {
      setStartTime(prefillTime);
      const [h, m] = prefillTime.split(":").map(Number);
      const endMin = h * 60 + m + 60;
      setEndTime(`${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`);
    }
  });

  const singleMutation = useMutation({
    mutationFn: async (data: { date: string; isBlocked: boolean; startTime?: string; endTime?: string; reason?: string }) => {
      const res = await apiRequest("POST", "/api/tutor/availability/exception", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability/week"] });
      toast({ title: isEs ? "Horario bloqueado" : "Time blocked" });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  });

  const batchMutation = useMutation({
    mutationFn: async (exceptions: Array<{ date: string; isBlocked: boolean; startTime?: string; endTime?: string; reason?: string }>) => {
      const res = await apiRequest("POST", "/api/tutor/availability/exceptions/batch", { exceptions });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability/week"] });
      toast({ title: isEs ? `${data.created} fechas bloqueadas` : `${data.created} dates blocked` });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  });

  const isPending = singleMutation.isPending || batchMutation.isPending;

  const handleSubmit = () => {
    if (mode === "full_day") {
      if (!date) return;
      singleMutation.mutate({ date, isBlocked: true, reason: reason || undefined });
    } else if (mode === "time_range") {
      if (!date || !startTime || !endTime) return;
      singleMutation.mutate({ date, isBlocked: true, startTime, endTime, reason: reason || undefined });
    } else if (mode === "recurring") {
      const dow = parseInt(dayOfWeek);
      const weeks = parseInt(numWeeks);
      if (!startTime || !endTime || weeks < 1) return;

      // Find next occurrence of the selected day of week
      const now = new Date();
      let nextDate = new Date(now);
      const currentDow = nextDate.getDay();
      const daysUntil = (dow - currentDow + 7) % 7 || 7;
      nextDate.setDate(nextDate.getDate() + daysUntil);

      const exceptions = [];
      for (let w = 0; w < weeks; w++) {
        const d = new Date(nextDate);
        d.setDate(d.getDate() + w * 7);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        exceptions.push({
          date: dateStr,
          isBlocked: true,
          startTime,
          endTime,
          reason: reason || undefined,
        });
      }
      batchMutation.mutate(exceptions);
    }
  };

  const dayNames = isEs ? DAY_NAMES_ES : DAY_NAMES_EN;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Ban className="h-5 w-5 text-destructive" />
            {isEs ? "Bloquear Horario" : "Block Time"}
          </DialogTitle>
        </DialogHeader>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
          {[
            { key: "full_day" as BlockMode, icon: Calendar, labelEs: "Día completo", labelEn: "Full Day" },
            { key: "time_range" as BlockMode, icon: Clock, labelEs: "Rango", labelEn: "Time Range" },
            { key: "recurring" as BlockMode, icon: Repeat, labelEs: "Recurrente", labelEn: "Recurring" },
          ].map(opt => (
            <button
              key={opt.key}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-md text-xs font-medium transition-colors ${
                mode === opt.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode(opt.key)}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {isEs ? opt.labelEs : opt.labelEn}
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          {/* Date picker — for full_day and time_range */}
          {(mode === "full_day" || mode === "time_range") && (
            <div className="space-y-1">
              <Label className="text-xs">{isEs ? "Fecha" : "Date"}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Day of week — for recurring */}
          {mode === "recurring" && (
            <div className="space-y-1">
              <Label className="text-xs">{isEs ? "Día de la semana" : "Day of Week"}</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 0].map(d => (
                    <SelectItem key={d} value={String(d)}>{dayNames[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time range — for time_range and recurring */}
          {(mode === "time_range" || mode === "recurring") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{isEs ? "Desde" : "From"}</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isEs ? "Hasta" : "To"}</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.filter(t => t > startTime).map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Number of weeks — for recurring */}
          {mode === "recurring" && (
            <div className="space-y-1">
              <Label className="text-xs">{isEs ? "Número de semanas" : "Number of Weeks"}</Label>
              <Select value={numWeeks} onValueChange={setNumWeeks}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {isEs ? (n === 1 ? "semana" : "semanas") : (n === 1 ? "week" : "weeks")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1">
            <Label className="text-xs">{isEs ? "Razón (opcional)" : "Reason (optional)"}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isEs ? "Ej: Vacaciones, Cita médica" : "E.g. Vacation, Doctor's appointment"}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            {isEs ? "Cancelar" : "Cancel"}
          </Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleSubmit}
            disabled={isPending || (mode !== "recurring" && !date)}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Ban className="h-4 w-4 mr-1" />
            )}
            {isEs ? "Bloquear" : "Block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
