import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";

interface DisputedClass {
  id: number;
  title: string;
  scheduledAt: string;
  duration: number;
  tutorConfirmation: string | null;
  studentConfirmation: string | null;
  userId: number;
  tutorId: number;
  studentName: string;
  studentEmail: string;
  tutorName: string;
}

export default function DisputedClassesTab({ isEs }: { isEs: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: classes = [], isLoading } = useQuery<DisputedClass[]>({
    queryKey: ["/api/admin/classes/disputed"],
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ classId, resolution }: { classId: number; resolution: "attended" | "refund" }) => {
      const response = await apiRequest("POST", `/api/admin/classes/${classId}/resolve-dispute`, { resolution });
      return response.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes/disputed"] });
      toast({
        title: isEs ? "Disputa resuelta" : "Dispute resolved",
        description: vars.resolution === "attended"
          ? (isEs ? "Clase marcada como tomada." : "Class marked as attended.")
          : (isEs ? "Crédito devuelto al estudiante." : "Credit refunded to student."),
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEs ? "No se pudo resolver la disputa." : "Could not resolve the dispute.",
        variant: "destructive",
      });
    },
  });

  const formatWhen = (iso: string) => new Date(iso).toLocaleString(isEs ? "es-ES" : "en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {isEs ? "Clases en Disputa" : "Disputed Classes"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {isEs
              ? "Clases donde el tutor confirmó que la dictó pero el estudiante reportó que no la tomó. Resuelve manualmente para liberar o devolver el crédito."
              : "Classes where the tutor confirmed teaching but the student reported not attending. Resolve manually to settle the credit."}
          </p>

          {isLoading && <p className="text-muted-foreground">{isEs ? "Cargando…" : "Loading…"}</p>}

          {!isLoading && classes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="w-10 h-10 mx-auto mb-2 text-success" />
              <p>{isEs ? "No hay disputas pendientes." : "No pending disputes."}</p>
            </div>
          )}

          <div className="space-y-3">
            {classes.map(c => (
              <div key={c.id} className="border border-destructive/30 bg-destructive/10/30 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-primary-900">{c.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{formatWhen(c.scheduledAt)} · {c.duration} min</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">{isEs ? "Estudiante" : "Student"}:</span>
                        <p className="font-medium text-primary-900">{c.studentName}</p>
                        <p className="text-xs text-muted-foreground">{c.studentEmail}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{isEs ? "Tutor" : "Tutor"}:</span>
                        <p className="font-medium text-primary-900">{c.tutorName}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 rounded bg-primary/15 text-primary">
                        {isEs ? "Tutor: sí dictó" : "Tutor: taught"}
                      </span>
                      <span className="px-2 py-1 rounded bg-destructive/15 text-destructive">
                        {isEs ? "Estudiante: no tomó" : "Student: didn't attend"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 md:min-w-[180px]">
                    <Button
                      size="sm"
                      onClick={() => resolveMutation.mutate({ classId: c.id, resolution: "attended" })}
                      disabled={resolveMutation.isPending}
                      className="bg-primary hover:bg-primary-900 text-white"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {isEs ? "Clase tomada" : "Mark attended"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveMutation.mutate({ classId: c.id, resolution: "refund" })}
                      disabled={resolveMutation.isPending}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      {isEs ? "Devolver crédito" : "Refund credit"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
