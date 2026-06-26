import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { PageHeader } from "./ui/page-header";
import { StatusBadge } from "./ui/status-badge";

interface CrmStudent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  classCredits: number;
  lastActivityAt: string | null;
  tags: { id: number; name: string; color: string }[];
  totalClasses: number;
  completedClasses: number;
  trialCompleted: boolean;
}

interface CrmResponse {
  students: CrmStudent[];
  total: number;
  page: number;
  limit: number;
  summary: {
    total: number;
    trial: number;
    lead: number;
    customer: number;
    negotiation: number;
    inactive: number;
  };
}

interface CrmPipelineProps {
  onSelectStudent: (userId: number) => void;
}

const COLUMNS = ["trial", "lead", "negotiation", "customer", "inactive"] as const;
type ColumnKey = (typeof COLUMNS)[number];

const COLUMN_LABELS: Record<ColumnKey, { en: string; es: string }> = {
  trial: { en: "Trial", es: "Prueba" },
  lead: { en: "Lead", es: "Prospecto" },
  negotiation: { en: "Negotiation", es: "Negociación" },
  customer: { en: "Customer", es: "Cliente" },
  inactive: { en: "Inactive", es: "Inactivo" },
};

export default function CrmPipeline({ onSelectStudent }: CrmPipelineProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<CrmStudent | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const { data, isLoading, error } = useQuery<CrmResponse>({
    queryKey: ["/api/admin/crm?limit=500"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/crm/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/admin/crm");
        },
      });
      toast({ title: isEs ? "Estudiante eliminado" : "Student deleted" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: isEs ? "Error al eliminar" : "Failed to delete", variant: "destructive" });
    },
  });

  const stageMutation = useMutation({
    mutationFn: async ({ userId, userType }: { userId: number; userType: string }) => {
      await apiRequest("PATCH", `/api/admin/crm/${userId}/stage`, { userType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm?limit=500"] });
    },
  });

  const grouped = useMemo(() => {
    const map: Record<ColumnKey, CrmStudent[]> = {
      trial: [],
      lead: [],
      negotiation: [],
      customer: [],
      inactive: [],
    };
    if (!data?.students) return map;
    for (const student of data.students) {
      const col = (student.userType as ColumnKey) in map ? (student.userType as ColumnKey) : "lead";
      map[col].push(student);
    }
    return map;
  }, [data]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const userId = parseInt(result.draggableId);
    const newColumn = result.destination.droppableId as ColumnKey;
    stageMutation.mutate({ userId, userType: newColumn });
  };

  if (error) {
    return (
      <div className="py-20 text-center text-destructive">
        {isEs ? "Error al cargar datos del CRM" : "Failed to load CRM data"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="Pipeline"
        description={isEs ? "Arrastra contactos entre etapas" : "Drag contacts between stages"}
      />

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div key={col} className="w-[280px] shrink-0 space-y-2">
              <Skeleton shimmer className="h-10 w-full rounded-xl" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} shimmer className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex min-h-[600px] gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => {
              const students = grouped[col];
              const label = isEs ? COLUMN_LABELS[col].es : COLUMN_LABELS[col].en;
              const credits = students.reduce((sum, s) => sum + (s.classCredits || 0), 0);

              return (
                <div key={col} className="w-[280px] shrink-0">
                  <div className="mb-2 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                    <StatusBadge status={col} variant="stage" label={label} />
                    <div className="flex items-center gap-2 text-xs">
                      {credits > 0 && (
                        <span className="text-muted-foreground">{credits} cr</span>
                      )}
                      <span className="font-display font-semibold tabular-nums text-foreground">{students.length}</span>
                    </div>
                  </div>

                  <Droppable droppableId={col}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[500px] space-y-2 rounded-xl p-2 transition-colors ${
                          snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/40"
                        }`}
                      >
                        {students.map((student, index) => (
                          <Draggable key={student.id} draggableId={String(student.id)} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => onSelectStudent(student.id)}
                              >
                                <Card
                                  className={`cursor-pointer rounded-xl p-3 transition-shadow hover:shadow-md ${
                                    dragSnapshot.isDragging ? "rotate-1 shadow-glow-primary" : "shadow-sm"
                                  }`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                      <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                                          {(student.firstName?.[0] ?? "") + (student.lastName?.[0] ?? "")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium leading-tight text-foreground">
                                          {student.firstName} {student.lastName}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                                      </div>
                                      <button
                                        className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteTarget(student);
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      {student.classCredits > 0 ? (
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                          {student.classCredits} {isEs ? "créditos" : "credits"}
                                        </span>
                                      ) : (
                                        <span />
                                      )}
                                      {student.lastActivityAt && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {new Date(student.lastActivityAt).toLocaleDateString(isEs ? "es-CO" : "en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </span>
                                      )}
                                    </div>

                                    {student.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {student.tags.map((tag) => (
                                          <span
                                            key={tag.id}
                                            className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                            style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                                          >
                                            {tag.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Delete Confirmation — requires typing the student name */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmName(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isEs ? "Eliminar estudiante" : "Delete student"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {isEs
                    ? `Estás a punto de eliminar a ${deleteTarget?.firstName} ${deleteTarget?.lastName} (${deleteTarget?.email}). Esta acción no se puede deshacer.`
                    : `You are about to delete ${deleteTarget?.firstName} ${deleteTarget?.lastName} (${deleteTarget?.email}). This action cannot be undone.`}
                </p>
                <p className="font-medium text-foreground">
                  {isEs
                    ? `Escribe "${deleteTarget?.firstName} ${deleteTarget?.lastName}" para confirmar:`
                    : `Type "${deleteTarget?.firstName} ${deleteTarget?.lastName}" to confirm:`}
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={`${deleteTarget?.firstName} ${deleteTarget?.lastName}`}
                  autoFocus
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isEs ? "Cancelar" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={
                deleteMutation.isPending ||
                deleteConfirmName.trim().toLowerCase() !== `${deleteTarget?.firstName} ${deleteTarget?.lastName}`.toLowerCase()
              }
            >
              {deleteMutation.isPending ? (isEs ? "Eliminando..." : "Deleting...") : (isEs ? "Eliminar" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
