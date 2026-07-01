import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  Clock,
  BookOpen,
  MessageSquare,
  ClipboardList,
  MapPin,
  Calendar,
  FileText,
  PlusCircle,
} from "lucide-react";
import LevelBadge from "@/components/LevelBadge";

interface StudentTimeline {
  student: {
    id: number;
    name: string;
    email: string;
    level: string;
    classCredits: number;
  };
  stats: {
    classesCompleted: number;
    quizAvg: number;
    quizAttempts: number;
    completedStations: number;
    aiConversations: number;
    aiLastActivity: string | null;
    pendingAssignments: number;
  };
  currentStation: {
    id: number;
    title: string;
    level: string;
    order: number;
  } | null;
  classes: Array<{
    id: number;
    title: string;
    scheduledAt: string;
    status: string;
    duration: number;
    sessionNotes: string | null;
    sharedNotes: string | null;
    homeworkText: string | null;
    topicsCovered: string[] | null;
  }>;
  assignments: Array<{
    id: number;
    title: string | null;
    description: string | null;
    status: string;
    dueDate: string | null;
    createdAt: string | null;
  }>;
  recentQuizzes: Array<{
    id: number;
    score: number;
    createdAt: string | null;
  }>;
}

interface Props {
  studentId: number | null;
  onClose: () => void;
}

function fmt(dateStr: string | null | undefined, lang: string, opts?: Intl.DateTimeFormatOptions) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(
    lang === "es" ? "es-ES" : "en-US",
    opts ?? { month: "short", day: "numeric", year: "numeric" }
  );
}

export default function StudentProfileDrawer({ studentId, onClose }: Props) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignModal, setAssignModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskUrl, setTaskUrl] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskMinutes, setTaskMinutes] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tutor/students/${studentId}/assignments`, {
        assignmentType: "free_form",
        title: taskTitle,
        description: taskDesc || undefined,
        attachmentUrl: taskUrl || undefined,
        estimatedMinutes: taskMinutes ? parseInt(taskMinutes) : undefined,
        dueDate: taskDue || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/students", studentId, "timeline"] });
      toast({ title: language === "es" ? "Tarea asignada" : "Assignment created" });
      setAssignModal(false);
      setTaskTitle(""); setTaskDesc(""); setTaskUrl(""); setTaskDue(""); setTaskMinutes(""); setSelectedMaterialId("");
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  });

  const { data: materials } = useQuery<Array<{ id: number; title: string; fileUrl: string | null; externalUrl: string | null }>>({
    queryKey: ["/api/tutor/materials"],
    queryFn: () => apiRequest("GET", "/api/tutor/materials").then(r => r.json()),
    enabled: assignModal,
  });

  const { data, isLoading } = useQuery<StudentTimeline>({
    queryKey: ["/api/tutor/students", studentId, "timeline"],
    queryFn: () => apiRequest("GET", `/api/tutor/students/${studentId}/timeline`).then(r => r.json()),
    enabled: !!studentId,
  });

  return (
    <Sheet open={!!studentId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading || !data ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
            <Skeleton className="h-40 mt-4" />
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  {data.student.name.charAt(0)}
                </div>
                <div>
                  <SheetTitle className="text-foreground text-lg">{data.student.name}</SheetTitle>
                  <p className="text-sm text-muted-foreground">{data.student.email}</p>
                </div>
                <div className="ml-auto flex flex-col items-end gap-1">
                  <LevelBadge level={data.student.level} />
                  <span className="text-xs text-muted-foreground">
                    {data.student.classCredits} {language === "es" ? "créditos" : "credits"}
                  </span>
                </div>
              </div>
            </SheetHeader>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {[
                { icon: CheckCircle, label: language === "es" ? "Clases" : "Classes", value: data.stats.classesCompleted, color: "text-success bg-success/10" },
                { icon: BookOpen, label: language === "es" ? "Estaciones" : "Stations", value: data.stats.completedStations, color: "text-primary bg-muted" },
                { icon: ClipboardList, label: language === "es" ? "Quiz prom." : "Quiz avg", value: data.stats.quizAvg > 0 ? `${data.stats.quizAvg}%` : "—", color: "text-purple-600 bg-purple-50" },
                { icon: MessageSquare, label: "IA", value: data.stats.aiConversations, color: "text-orange-500 bg-orange-50" },
                { icon: Clock, label: language === "es" ? "Tareas" : "Assignments", value: data.stats.pendingAssignments, color: "text-accent bg-accent/10" },
                { icon: MapPin, label: language === "es" ? "Estación actual" : "Current station", value: data.currentStation ? `${data.currentStation.level}-${data.currentStation.order}` : "—", color: "text-foreground bg-muted" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className={`rounded-lg p-3 ${color.split(" ")[1]}`}>
                  <Icon className={`h-4 w-4 mb-1 ${color.split(" ")[0]}`} />
                  <p className={`text-base font-bold ${color.split(" ")[0]}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* Assign task button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="text-primary border-primary/30 hover:bg-muted"
                onClick={() => setAssignModal(true)}
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                {language === "es" ? "Asignar tarea" : "Assign task"}
              </Button>
            </div>

            {/* Current station */}
            {data.currentStation && (
              <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-muted/50">
                <p className="text-xs font-semibold text-primary uppercase mb-1">
                  {language === "es" ? "Trabajando en" : "Currently on"}
                </p>
                <p className="text-sm font-medium text-foreground">{data.currentStation.title}</p>
                <p className="text-xs text-muted-foreground">{data.currentStation.level} · Estación {data.currentStation.order}</p>
              </div>
            )}

            {/* Class history */}
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {language === "es" ? "Historial de clases" : "Class history"}
              </h3>

              {data.classes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {language === "es" ? "Sin clases aún" : "No classes yet"}
                </p>
              ) : (
                <div className="space-y-3">
                  {data.classes.map(c => (
                    <div key={c.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">
                          {fmt(c.scheduledAt, language, { weekday: "short", month: "short", day: "numeric" })}
                          {" · "}{c.duration} min
                        </p>
                        <Badge
                          variant="outline"
                          className={c.status === "completed"
                            ? "border-green-300 text-success text-[10px]"
                            : "border-border text-muted-foreground text-[10px]"}
                        >
                          {c.status === "completed"
                            ? (language === "es" ? "Completada" : "Completed")
                            : (language === "es" ? "Agendada" : "Scheduled")}
                        </Badge>
                      </div>

                      {c.topicsCovered && c.topicsCovered.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {c.topicsCovered.map(t => (
                            <span key={t} className="text-[10px] bg-primary/10 text-primary rounded px-2 py-0.5">{t}</span>
                          ))}
                        </div>
                      )}

                      {c.sharedNotes && (
                        <p className="text-xs text-foreground/80 leading-relaxed">{c.sharedNotes}</p>
                      )}

                      {c.homeworkText && (
                        <div className="p-2 bg-accent/10 rounded border-l-2 border-accent">
                          <p className="text-[10px] font-semibold text-accent uppercase mb-0.5">
                            {language === "es" ? "Tarea" : "Homework"}
                          </p>
                          <p className="text-xs text-foreground">{c.homeworkText}</p>
                        </div>
                      )}

                      {c.sessionNotes && (
                        <div className="p-2 bg-muted/40 rounded border border-dashed border-border">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">
                            {language === "es" ? "Notas privadas" : "Private notes"}
                          </p>
                          <p className="text-xs text-muted-foreground">{c.sessionNotes}</p>
                        </div>
                      )}

                      {!c.sharedNotes && !c.homeworkText && !c.sessionNotes && c.status === "completed" && (
                        <p className="text-[10px] text-muted-foreground italic">
                          {language === "es" ? "Sin notas registradas" : "No notes recorded"}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent quizzes */}
            {data.recentQuizzes.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {language === "es" ? "Quizzes recientes" : "Recent quizzes"}
                </h3>
                <div className="space-y-2">
                  {data.recentQuizzes.map(q => (
                    <div key={q.id} className="flex items-center justify-between text-sm px-3 py-2 bg-muted/40 rounded-lg">
                      <span className="text-xs text-muted-foreground">{fmt(q.createdAt, language)}</span>
                      <span className={`text-xs font-bold ${q.score >= 80 ? "text-success" : q.score >= 60 ? "text-accent" : "text-destructive"}`}>
                        {q.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments */}
            {data.assignments.length > 0 && (
              <div className="mt-5 pb-8">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  {language === "es" ? "Tareas asignadas" : "Assignments"}
                </h3>
                <div className="space-y-2">
                  {data.assignments.map(a => (
                    <div key={a.id} className="flex items-start justify-between text-sm px-3 py-2 border rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-foreground">{a.title || (language === "es" ? "Tarea" : "Assignment")}</p>
                        {a.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          a.status === "completed"
                            ? "border-green-300 text-success text-[10px] ml-2 flex-shrink-0"
                            : "border-accent text-accent text-[10px] ml-2 flex-shrink-0"
                        }
                      >
                        {a.status === "completed"
                          ? (language === "es" ? "Entregada" : "Done")
                          : (language === "es" ? "Pendiente" : "Pending")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>

      {/* Assign free-form task modal */}
      <Dialog open={assignModal} onOpenChange={setAssignModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {language === "es" ? "Nueva tarea para " : "New task for "}
              {data?.student.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="taskTitle">{language === "es" ? "Título *" : "Title *"}</Label>
              <Input
                id="taskTitle"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={language === "es" ? "Escribe un párrafo sobre tu familia..." : "Write a paragraph about your family..."}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskDesc">{language === "es" ? "Instrucciones" : "Instructions"}</Label>
              <Textarea
                id="taskDesc"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                rows={3}
                placeholder={language === "es" ? "Detalles adicionales..." : "Additional details..."}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="taskDue">{language === "es" ? "Fecha límite" : "Due date"}</Label>
                <Input id="taskDue" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taskMin">{language === "es" ? "Minutos est." : "Est. minutes"}</Label>
                <Input id="taskMin" type="number" value={taskMinutes} onChange={(e) => setTaskMinutes(e.target.value)} placeholder="30" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{language === "es" ? "Material (opcional)" : "Material (optional)"}</Label>
              {materials && materials.length > 0 && (
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={selectedMaterialId}
                  onChange={(e) => {
                    setSelectedMaterialId(e.target.value);
                    if (e.target.value) {
                      const mat = materials.find(m => m.id === parseInt(e.target.value));
                      if (mat) setTaskUrl(mat.externalUrl || mat.fileUrl || "");
                    }
                  }}
                >
                  <option value="">{language === "es" ? "— Seleccionar de mis materiales —" : "— Select from my materials —"}</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              )}
              <Input id="taskUrl" value={taskUrl} onChange={(e) => { setTaskUrl(e.target.value); setSelectedMaterialId(""); }} placeholder={language === "es" ? "O pegar link manualmente..." : "Or paste link manually..."} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModal(false)}>
              {language === "es" ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!taskTitle.trim() || createAssignmentMutation.isPending}
              onClick={() => createAssignmentMutation.mutate()}
            >
              {createAssignmentMutation.isPending
                ? (language === "es" ? "Guardando..." : "Saving...")
                : (language === "es" ? "Asignar" : "Assign")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
