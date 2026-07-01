import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  X,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Mail,
  Phone,
  PhoneCall,
  MessageSquare,
  MessageCircle,
  Calendar,
  Clock,
  CreditCard,
  User,
  Send,
} from "lucide-react";
import CommunicationTimeline from "./CommunicationTimeline";
import QuickSendDialog from "./QuickSendDialog";

interface CrmTag {
  id: number;
  name: string;
  color: string;
}

interface CrmNote {
  id: number;
  userId: number;
  adminId: number;
  content: string;
  createdAt: string;
}

interface CrmTask {
  id: number;
  userId: number | null;
  assignedTo: number;
  title: string;
  description: string | null;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: string;
  completedAt: string | null;
  createdAt: string;
}

interface StudentClass {
  id: number;
  tutorId: number;
  scheduledAt: string;
  status: string;
  isTrial: boolean;
  tutorConfirmation?: string | null;
}

interface StudentDetailData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  userType: string;
  classCredits: number;
  trialCompleted: boolean;
  createdAt: string;
  lastActivityAt: string | null;
  leadSource?: string | null;
  classes: StudentClass[];
  notes: CrmNote[];
  tasks: CrmTask[];
  tags: CrmTag[];
}

interface StudentDetailProps {
  userId: number | null;
  open: boolean;
  onClose: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-foreground",
  medium: "bg-warning/15 text-warning-foreground",
  high: "bg-destructive/10 text-destructive",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  "no-show": "bg-warning/15 text-warning-foreground",
};

export default function StudentDetail({ userId, open, onClose }: StudentDetailProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [noteContent, setNoteContent] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<string>("medium");
  const [showQuickSend, setShowQuickSend] = useState(false);
  const [creditsDraft, setCreditsDraft] = useState<string>("");
  const [creditsConfirm, setCreditsConfirm] = useState<number | null>(null);

  const { data: student, isLoading } = useQuery<StudentDetailData>({
    queryKey: ["/api/admin/crm", userId],
    enabled: !!userId && open,
  });

  const { data: allTags } = useQuery<CrmTag[]>({
    queryKey: ["/api/admin/crm/tags"],
    enabled: open,
  });

  // --- Mutations ---

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/admin/crm/${userId}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm", userId] });
      setNoteContent("");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await apiRequest("DELETE", `/api/admin/crm/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm", userId] });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await apiRequest("POST", `/api/admin/crm/${userId}/tags`, { tagId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm?limit=500"] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await apiRequest("DELETE", `/api/admin/crm/${userId}/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm?limit=500"] });
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async (task: { userId: number; title: string; dueDate: string; priority: string }) => {
      await apiRequest("POST", `/api/admin/crm/tasks`, task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm", userId] });
      setTaskTitle("");
      setTaskDueDate("");
      setTaskPriority("medium");
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/crm/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm", userId] });
    },
  });

  const updateCreditsMutation = useMutation({
    mutationFn: async (classCredits: number) => {
      await apiRequest("PATCH", `/api/admin/crm/${userId}/credits`, { classCredits });
    },
    onSuccess: (_data, classCredits) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm?limit=500"] });
      setCreditsDraft("");
      toast({
        title: isEs ? "Creditos actualizados" : "Credits updated",
        description: isEs
          ? `Saldo nuevo: ${classCredits}`
          : `New balance: ${classCredits}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: isEs ? "Error al actualizar creditos" : "Failed to update credits",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logMutation = useMutation({
    mutationFn: async (entry: { channel: string; body?: string }) => {
      await apiRequest("POST", `/api/admin/crm/${userId}/log`, entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-communications", userId] });
    },
  });

  const moveStageMutation = useMutation({
    mutationFn: async (userType: string) => {
      await apiRequest("PATCH", `/api/admin/crm/${userId}/stage`, { userType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm?limit=500"] });
    },
  });

  const handleMoveStage = (newType: string) => {
    const prev = student?.userType;
    if (!prev || prev === newType) return;
    moveStageMutation.mutate(newType, {
      onSuccess: () => {
        toast({
          title: isEs ? "Etapa actualizada" : "Stage updated",
          action: (
            <ToastAction
              altText={isEs ? "Deshacer" : "Undo"}
              onClick={() => moveStageMutation.mutate(prev)}
            >
              {isEs ? "Deshacer" : "Undo"}
            </ToastAction>
          ),
        });
      },
    });
  };

  // Multichannel click-to-contact (tel/sms/whatsapp). El vendedor elige por contacto.
  const phoneDigits = (student?.phone || "").replace(/\D/g, "");
  const contactMsg = isEs
    ? `Hola ${student?.firstName ?? ""}, te escribo de Passport2Fluency 👋`
    : `Hi ${student?.firstName ?? ""}, this is Passport2Fluency 👋`;
  const openChannel = (channel: "call" | "sms" | "whatsapp", url: string) => {
    window.open(url, channel === "call" ? "_self" : "_blank");
    logMutation.mutate({ channel, body: channel === "call" ? "Llamada iniciada" : contactMsg });
  };

  const handleUpdateCredits = () => {
    if (!student) return;
    const trimmed = creditsDraft.trim();
    if (trimmed === "") return;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1000) {
      toast({
        title: isEs ? "Valor invalido" : "Invalid value",
        description: isEs
          ? "Ingresa un entero entre 0 y 1000"
          : "Enter an integer between 0 and 1000",
        variant: "destructive",
      });
      return;
    }
    if (parsed === student.classCredits) return;
    setCreditsConfirm(parsed);
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNoteMutation.mutate(noteContent.trim());
  };

  const handleAddTask = () => {
    if (!taskTitle.trim() || !taskDueDate || !userId) return;
    addTaskMutation.mutate({
      userId,
      title: taskTitle.trim(),
      dueDate: taskDueDate,
      priority: taskPriority,
    });
  };

  const availableTags = allTags?.filter(
    (tag) => !student?.tags.some((t) => t.id === tag.id)
  ) ?? [];

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : student ? (
              <div className="flex items-center gap-3 w-full">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold truncate">
                    {student.firstName} {student.lastName}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StatusBadge status={student.userType} variant="stage" size="sm" />
                    {student.leadSource && (
                      <span className="text-xs text-muted-foreground">· {student.leadSource}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              isEs ? "Estudiante no encontrado" : "Student not found"
            )}
          </SheetTitle>
        </SheetHeader>

        {student && (
          <>
            {/* Quick contact actions (multichannel) + move stage */}
            <div className="flex flex-wrap items-center gap-2 border-b py-3">
              {phoneDigits && (
                <>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => openChannel("call", `tel:${student.phone}`)}>
                    <PhoneCall className="h-3.5 w-3.5" /> {isEs ? "Llamar" : "Call"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => openChannel("sms", `sms:${student.phone}?&body=${encodeURIComponent(contactMsg)}`)}>
                    <MessageSquare className="h-3.5 w-3.5" /> SMS
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-success hover:text-success" onClick={() => openChannel("whatsapp", `https://wa.me/${phoneDigits}?text=${encodeURIComponent(contactMsg)}`)}>
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setShowQuickSend(true)}>
                <Mail className="h-3.5 w-3.5" /> Email
              </Button>
              <div className="ml-auto">
                <Select value={student.userType} onValueChange={handleMoveStage}>
                  <SelectTrigger className="h-8 w-[148px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">{isEs ? "Prueba" : "Trial"}</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="negotiation">{isEs ? "Negociación" : "Negotiation"}</SelectItem>
                    <SelectItem value="customer">{isEs ? "Cliente" : "Customer"}</SelectItem>
                    <SelectItem value="inactive">{isEs ? "Inactivo" : "Inactive"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Trial outcome */}
            {(() => {
              const trial = student.classes?.find((c) => c.isTrial);
              if (!trial) return null;
              const outcome =
                trial.tutorConfirmation === "attended" || trial.status === "completed"
                  ? { status: "success", label: isEs ? "Trial: asistió" : "Trial: attended" }
                  : trial.tutorConfirmation === "no_show"
                    ? { status: "danger", label: isEs ? "Trial: no-show" : "Trial: no-show" }
                    : trial.status === "scheduled"
                      ? { status: "info", label: isEs ? "Trial: agendado" : "Trial: scheduled" }
                      : { status: "neutral", label: isEs ? "Trial: pendiente" : "Trial: pending" };
              return (
                <div className="flex items-center gap-2 border-b py-2 text-xs text-muted-foreground">
                  <span>{isEs ? "Resultado del trial:" : "Trial outcome:"}</span>
                  <StatusBadge status={outcome.status} size="sm" label={outcome.label} />
                </div>
              );
            })()}
          </>
        )}

        {student && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview" className="text-xs">
                {isEs ? "General" : "Overview"}
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">
                {isEs ? "Notas" : "Notes"}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                {isEs ? "Tareas" : "Tasks"}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                {isEs ? "Historial" : "History"}
              </TabsTrigger>
              <TabsTrigger value="comms" className="text-xs">
                {isEs ? "Comms" : "Comms"}
              </TabsTrigger>
            </TabsList>

            {/* ─── Overview Tab ─── */}
            <TabsContent value="overview" className="space-y-5 mt-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {isEs ? "Informacion de contacto" : "Contact Information"}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>
                      {isEs ? "Registro:" : "Registered:"}{" "}
                      {new Date(student.createdAt).toLocaleDateString(
                        isEs ? "es-CO" : "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </span>
                  </div>
                  {student.lastActivityAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>
                        {isEs ? "Ultima actividad:" : "Last activity:"}{" "}
                        {new Date(student.lastActivityAt).toLocaleDateString(
                          isEs ? "es-CO" : "en-US",
                          { year: "numeric", month: "short", day: "numeric" }
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {isEs ? "Creditos:" : "Credits:"} {student.classCredits}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={1000}
                      step={1}
                      placeholder={isEs ? "Nuevo" : "New"}
                      value={creditsDraft}
                      onChange={(e) => setCreditsDraft(e.target.value)}
                      className="h-7 w-20 text-xs ml-2"
                      data-testid="input-credits"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUpdateCredits}
                      disabled={
                        creditsDraft.trim() === "" || updateCreditsMutation.isPending
                      }
                      className="h-7 text-xs px-2 text-primary border-primary hover:bg-muted"
                      data-testid="button-update-credits"
                    >
                      {updateCreditsMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        isEs ? "Actualizar" : "Update"
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>
                      {isEs ? "Trial completado:" : "Trial completed:"}{" "}
                      {student.trialCompleted ? (isEs ? "Si" : "Yes") : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags section */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {isEs ? "Etiquetas" : "Tags"}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {student.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <button
                        onClick={() => removeTagMutation.mutate(tag.id)}
                        className="hover:bg-white/20 rounded-full p-0.5"
                        aria-label={`Remove tag ${tag.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {availableTags.length > 0 && (
                  <Select onValueChange={(val) => addTagMutation.mutate(parseInt(val))}>
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue placeholder={isEs ? "Agregar etiqueta..." : "Add tag..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag.id} value={String(tag.id)}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full inline-block"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </TabsContent>

            {/* ─── Notes Tab ─── */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Textarea
                  placeholder={isEs ? "Escribe una nota..." : "Write a note..."}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!noteContent.trim() || addNoteMutation.isPending}
                  className="bg-primary hover:bg-primary-900 text-white"
                >
                  {addNoteMutation.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  )}
                  <Plus className="h-3 w-3 mr-1" />
                  {isEs ? "Agregar Nota" : "Add Note"}
                </Button>
              </div>

              <div className="space-y-3">
                {student.notes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isEs ? "Sin notas aun" : "No notes yet"}
                  </p>
                )}
                {[...student.notes]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((note) => (
                    <div
                      key={note.id}
                      className="border rounded-lg p-3 space-y-1 bg-muted/40/50"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-xs text-muted-foreground">
                          {isEs ? "Admin" : "Admin"} &middot;{" "}
                          {new Date(note.createdAt).toLocaleDateString(
                            isEs ? "es-CO" : "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </p>
                        <button
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={isEs ? "Eliminar nota" : "Delete note"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
              </div>
            </TabsContent>

            {/* ─── Tasks Tab ─── */}
            <TabsContent value="tasks" className="space-y-4 mt-4">
              <div className="space-y-2 border rounded-lg p-3 bg-muted/40/50">
                <Input
                  placeholder={isEs ? "Titulo de la tarea..." : "Task title..."}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="text-sm h-8"
                />
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="text-sm h-8 flex-1"
                  />
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        {isEs ? "Baja" : "Low"}
                      </SelectItem>
                      <SelectItem value="medium">
                        {isEs ? "Media" : "Medium"}
                      </SelectItem>
                      <SelectItem value="high">
                        {isEs ? "Alta" : "High"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddTask}
                  disabled={!taskTitle.trim() || !taskDueDate || addTaskMutation.isPending}
                  className="bg-primary hover:bg-primary-900 text-white"
                >
                  {addTaskMutation.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  )}
                  <Plus className="h-3 w-3 mr-1" />
                  {isEs ? "Agregar Tarea" : "Add Task"}
                </Button>
              </div>

              <div className="space-y-2">
                {student.tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isEs ? "Sin tareas aun" : "No tasks yet"}
                  </p>
                )}
                {[...student.tasks]
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map((task) => {
                    const isCompleted = task.status === "completed";
                    const isOverdue =
                      !isCompleted && new Date(task.dueDate) < new Date();

                    return (
                      <div
                        key={task.id}
                        className={`flex items-start gap-2 border rounded-lg p-3 transition-colors ${
                          isCompleted ? "bg-muted/40 opacity-60" : "bg-card"
                        }`}
                      >
                        <button
                          onClick={() =>
                            toggleTaskMutation.mutate({
                              taskId: task.id,
                              status: isCompleted ? "pending" : "completed",
                            })
                          }
                          className="mt-0.5 shrink-0"
                          aria-label={isCompleted ? "Mark as pending" : "Mark as completed"}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/60 hover:text-primary" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
                              }`}
                            >
                              {task.priority === "low"
                                ? isEs ? "Baja" : "Low"
                                : task.priority === "high"
                                ? isEs ? "Alta" : "High"
                                : isEs ? "Media" : "Medium"}
                            </span>
                            <span
                              className={`text-[10px] ${
                                isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                              }`}
                            >
                              {new Date(task.dueDate).toLocaleDateString(
                                isEs ? "es-CO" : "en-US",
                                { month: "short", day: "numeric" }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </TabsContent>

            {/* ─── History Tab ─── */}
            <TabsContent value="history" className="space-y-3 mt-4">
              {student.classes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isEs ? "Sin historial de clases" : "No class history"}
                </p>
              )}
              {[...student.classes]
                .sort(
                  (a, b) =>
                    new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
                )
                .map((cls) => (
                  <div
                    key={cls.id}
                    className="border rounded-lg p-3 flex items-center justify-between bg-card"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {isEs ? "Tutor" : "Tutor"} #{cls.tutorId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(cls.scheduledAt).toLocaleDateString(
                          isEs ? "es-CO" : "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {cls.isTrial && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-accent text-accent"
                        >
                          Trial
                        </Badge>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          STATUS_COLORS[cls.status] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {cls.status}
                      </span>
                    </div>
                  </div>
                ))}
            </TabsContent>

            {/* ─── Communications Tab ─── */}
            <TabsContent value="comms" className="mt-4">
              <CommunicationTimeline userId={student.id} />
            </TabsContent>
          </Tabs>
        )}

        {/* Quick Send Dialog */}
        {student && (
          <QuickSendDialog
            userId={student.id}
            userName={`${student.firstName} ${student.lastName}`}
            userEmail={student.email}
            open={showQuickSend}
            onClose={() => setShowQuickSend(false)}
          />
        )}

        {/* Confirmación de ajuste de créditos (reemplaza window.confirm) */}
        <AlertDialog open={creditsConfirm !== null} onOpenChange={(o) => { if (!o) setCreditsConfirm(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{isEs ? "¿Ajustar créditos de clase?" : "Adjust class credits?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {isEs
                  ? `Vas a cambiar los créditos de ${student?.firstName} ${student?.lastName} de ${student?.classCredits} a ${creditsConfirm}. El estudiante verá el saldo nuevo de inmediato.`
                  : `You're changing ${student?.firstName} ${student?.lastName}'s credits from ${student?.classCredits} to ${creditsConfirm}. The student sees the new balance immediately.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{isEs ? "Cancelar" : "Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (creditsConfirm !== null) updateCreditsMutation.mutate(creditsConfirm);
                  setCreditsConfirm(null);
                }}
              >
                {isEs ? "Ajustar créditos" : "Adjust credits"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
