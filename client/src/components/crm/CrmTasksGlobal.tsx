import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  Trash2,
  Plus,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";

interface CrmTask {
  id: number;
  title: string;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed";
  userId: number | null;
  createdAt: string;
}

const PRIORITY_STYLES: Record<string, { className: string; label: { en: string; es: string } }> = {
  high: { className: "bg-red-100 text-red-700 border-red-200", label: { en: "High", es: "Alta" } },
  medium: { className: "bg-yellow-100 text-yellow-700 border-yellow-200", label: { en: "Medium", es: "Media" } },
  low: { className: "bg-gray-100 text-gray-600 border-gray-200", label: { en: "Low", es: "Baja" } },
};

export default function CrmTasksGlobal() {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();

  const [showCompleted, setShowCompleted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState<string>("medium");

  const { data: tasks, isLoading, error } = useQuery<CrmTask[]>({
    queryKey: ["/api/admin/crm/tasks"],
  });

  const completeMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/crm/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/admin/crm/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/tasks"] });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { title: string; dueDate: string | null; priority: string }) => {
      await apiRequest("POST", "/api/admin/crm/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/tasks"] });
      setShowAddForm(false);
      setNewTitle("");
      setNewDueDate("");
      setNewPriority("medium");
    },
  });

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    const filtered = tasks.filter((t) =>
      showCompleted ? t.status === "completed" : t.status === "pending"
    );
    return filtered.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, showCompleted]);

  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    addMutation.mutate({
      title: newTitle.trim(),
      dueDate: newDueDate || null,
      priority: newPriority,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1C7BB1]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        {isEs ? "Error al cargar tareas" : "Failed to load tasks"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
            {isEs ? "Tareas" : "Tasks"} ({filteredTasks.length})
          </h3>
          <Button
            variant={showCompleted ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted
              ? isEs
                ? "Ver Pendientes"
                : "Show Pending"
              : isEs
                ? "Ver Completadas"
                : "Show Completed"}
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#1C7BB1] hover:bg-[#0A4A6E]"
        >
          <Plus className="h-4 w-4 mr-1" />
          {isEs ? "Agregar Tarea" : "Add Task"}
        </Button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <Card className="border-[#1C7BB1]/30">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder={isEs ? "Titulo de la tarea" : "Task title"}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-40"
              />
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">{isEs ? "Alta" : "High"}</SelectItem>
                  <SelectItem value="medium">{isEs ? "Media" : "Medium"}</SelectItem>
                  <SelectItem value="low">{isEs ? "Baja" : "Low"}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddTask}
                disabled={!newTitle.trim() || addMutation.isPending}
                className="bg-[#1C7BB1] hover:bg-[#0A4A6E]"
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEs ? (
                  "Crear"
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          {showCompleted
            ? isEs
              ? "No hay tareas completadas"
              : "No completed tasks"
            : isEs
              ? "No hay tareas pendientes"
              : "No pending tasks"}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task.dueDate) && task.status === "pending";
            const priorityInfo = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium;

            return (
              <Card
                key={task.id}
                className={`transition-colors ${overdue ? "border-red-300 bg-red-50/50" : ""}`}
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  {/* Checkbox */}
                  <Checkbox
                    checked={task.status === "completed"}
                    disabled={completeMutation.isPending}
                    onCheckedChange={(checked) => {
                      completeMutation.mutate({
                        taskId: task.id,
                        status: checked ? "completed" : "pending",
                      });
                    }}
                  />

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-medium ${
                          task.status === "completed"
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      <Badge variant="outline" className={priorityInfo.className}>
                        {isEs ? priorityInfo.label.es : priorityInfo.label.en}
                      </Badge>
                      {task.userId && (
                        <span className="text-xs text-muted-foreground">
                          {isEs ? "Estudiante" : "Student"} #{task.userId}
                        </span>
                      )}
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString(
                          isEs ? "es-CO" : "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                        {overdue && (
                          <span className="flex items-center gap-1 text-red-600 font-medium ml-2">
                            <AlertTriangle className="h-3 w-3" />
                            {isEs ? "Vencida" : "Overdue"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
