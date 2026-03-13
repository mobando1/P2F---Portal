import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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
import {
  Loader2,
  X,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Mail,
  Phone,
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

const STAGE_COLORS: Record<string, string> = {
  trial: "#1C7BB1",
  lead: "#F59E1C",
  negotiation: "#0A4A6E",
  customer: "#22c55e",
  inactive: "#94a3b8",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  "no-show": "bg-orange-100 text-orange-800",
};

export default function StudentDetail({ userId, open, onClose }: StudentDetailProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [noteContent, setNoteContent] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<string>("medium");
  const [showQuickSend, setShowQuickSend] = useState(false);

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
              <Loader2 className="h-5 w-5 animate-spin text-[#1C7BB1]" />
            ) : student ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#EAF4FA] flex items-center justify-center">
                    <User className="h-5 w-5 text-[#1C7BB1]" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {student.firstName} {student.lastName}
                    </p>
                    <Badge
                      className="text-[10px] text-white mt-0.5"
                      style={{ backgroundColor: STAGE_COLORS[student.userType] || "#94a3b8" }}
                    >
                      {student.userType}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQuickSend(true)}
                  className="gap-1 text-[#1C7BB1] border-[#1C7BB1] hover:bg-[#EAF4FA]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isEs ? "Enviar" : "Send"}</span>
                </Button>
              </div>
            ) : (
              isEs ? "Estudiante no encontrado" : "Student not found"
            )}
          </SheetTitle>
        </SheetHeader>

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
                <h4 className="text-sm font-semibold text-gray-700">
                  {isEs ? "Informacion de contacto" : "Contact Information"}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4 text-[#1C7BB1]" />
                    <span>{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-[#1C7BB1]" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 text-[#1C7BB1]" />
                    <span>
                      {isEs ? "Registro:" : "Registered:"}{" "}
                      {new Date(student.createdAt).toLocaleDateString(
                        isEs ? "es-CO" : "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </span>
                  </div>
                  {student.lastActivityAt && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4 text-[#1C7BB1]" />
                      <span>
                        {isEs ? "Ultima actividad:" : "Last activity:"}{" "}
                        {new Date(student.lastActivityAt).toLocaleDateString(
                          isEs ? "es-CO" : "en-US",
                          { year: "numeric", month: "short", day: "numeric" }
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <CreditCard className="h-4 w-4 text-[#1C7BB1]" />
                    <span>
                      {isEs ? "Creditos:" : "Credits:"} {student.classCredits}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-[#1C7BB1]" />
                    <span>
                      {isEs ? "Trial completado:" : "Trial completed:"}{" "}
                      {student.trialCompleted ? (isEs ? "Si" : "Yes") : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags section */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">
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
                  className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
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
                  <p className="text-sm text-gray-400 text-center py-4">
                    {isEs ? "Sin notas aun" : "No notes yet"}
                  </p>
                )}
                {[...student.notes]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((note) => (
                    <div
                      key={note.id}
                      className="border rounded-lg p-3 space-y-1 bg-gray-50/50"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-xs text-gray-400">
                          {isEs ? "Admin" : "Admin"} &middot;{" "}
                          {new Date(note.createdAt).toLocaleDateString(
                            isEs ? "es-CO" : "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </p>
                        <button
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={isEs ? "Eliminar nota" : "Delete note"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
              </div>
            </TabsContent>

            {/* ─── Tasks Tab ─── */}
            <TabsContent value="tasks" className="space-y-4 mt-4">
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50/50">
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
                  className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
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
                  <p className="text-sm text-gray-400 text-center py-4">
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
                          isCompleted ? "bg-gray-50 opacity-60" : "bg-white"
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
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300 hover:text-[#1C7BB1]" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              isCompleted ? "line-through text-gray-400" : "text-gray-800"
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
                                isOverdue ? "text-red-500 font-medium" : "text-gray-400"
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
                <p className="text-sm text-gray-400 text-center py-4">
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
                    className="border rounded-lg p-3 flex items-center justify-between bg-white"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-800">
                        {isEs ? "Tutor" : "Tutor"} #{cls.tutorId}
                      </p>
                      <p className="text-xs text-gray-400">
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
                          className="text-[10px] border-[#F59E1C] text-[#F59E1C]"
                        >
                          Trial
                        </Badge>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          STATUS_COLORS[cls.status] || "bg-gray-100 text-gray-600"
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
      </SheetContent>
    </Sheet>
  );
}
