import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, refreshUserAndCredits } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle } from "lucide-react";

interface PendingItem {
  id: number;
  title: string;
  scheduledAt: string;
  duration: number;
  deadline: string | null;
  role: "tutor" | "student";
  counterpartName: string;
}

export function AttendanceConfirmationBanner() {
  const { language } = useLanguage();
  const isEs = language === "es";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();

  const { data: items = [] } = useQuery<PendingItem[]>({
    queryKey: ["/api/classes/pending-confirmation"],
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ classId, attended }: { classId: number; attended: boolean }) => {
      const response = await apiRequest("POST", `/api/classes/${classId}/confirm-attendance`, { attended });
      return response.json();
    },
    onSuccess: async (_data, vars) => {
      await refreshUserAndCredits(queryClient, user?.id);
      toast({
        title: isEs ? "Respuesta registrada" : "Response saved",
        description: vars.attended
          ? (isEs ? "Marcaste la clase como realizada." : "You marked the class as attended.")
          : (isEs ? "Marcaste la clase como no realizada." : "You marked the class as not attended."),
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEs ? "No pudimos guardar tu respuesta." : "We couldn't save your response.",
        variant: "destructive",
      });
    },
  });

  if (items.length === 0) return null;

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(isEs ? "es-ES" : "en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  return (
    <div className="mb-6 space-y-3">
      {items.map((item) => {
        const isTutorRole = item.role === "tutor";
        const question = isTutorRole
          ? (isEs ? "¿Dictaste esta clase?" : "Did you teach this class?")
          : (isEs ? "¿Tomaste esta clase?" : "Did you take this class?");
        const yesLabel = isEs ? "Sí" : "Yes";
        const noLabel = isEs ? "No" : "No";
        const counterpartLabel = isTutorRole
          ? (isEs ? "Estudiante" : "Student")
          : (isEs ? "Tutor" : "Tutor");
        return (
          <Card key={item.id} className="border-0 shadow-md bg-gradient-to-r from-[#F59E1C]/15 to-[#1C7BB1]/10 border-l-4 border-l-[#F59E1C]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-[#F59E1C]/20 rounded-lg flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-[#F59E1C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#0A4A6E] text-sm sm:text-base">{question}</h3>
                  <p className="text-[#0A4A6E]/70 text-xs sm:text-sm mt-1">
                    {counterpartLabel}: <span className="font-semibold">{item.counterpartName}</span>
                  </p>
                  <p className="text-[#0A4A6E]/60 text-xs mt-0.5">{formatWhen(item.scheduledAt)}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => confirmMutation.mutate({ classId: item.id, attended: true })}
                  disabled={confirmMutation.isPending}
                  className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {yesLabel}
                </Button>
                <Button
                  onClick={() => confirmMutation.mutate({ classId: item.id, attended: false })}
                  disabled={confirmMutation.isPending}
                  variant="outline"
                  className="border-[#0A4A6E]/30 text-[#0A4A6E] hover:bg-[#0A4A6E]/10 flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  {noLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
