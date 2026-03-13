import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

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

const COLUMNS = [
  { key: "trial", color: "#1C7BB1" },
  { key: "lead", color: "#F59E1C" },
  { key: "negotiation", color: "#0A4A6E" },
  { key: "customer", color: "#22c55e" },
  { key: "inactive", color: "#94a3b8" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

const COLUMN_LABELS: Record<ColumnKey, { en: string; es: string }> = {
  trial: { en: "Trial", es: "Prueba" },
  lead: { en: "Lead", es: "Prospecto" },
  negotiation: { en: "Negotiation", es: "Negociacion" },
  customer: { en: "Customer", es: "Cliente" },
  inactive: { en: "Inactive", es: "Inactivo" },
};

export default function CrmPipeline({ onSelectStudent }: CrmPipelineProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<CrmResponse>({
    queryKey: ["/api/admin/crm?limit=500"],
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
    const { draggableId, destination } = result;
    const userId = parseInt(draggableId);
    const newColumn = destination.droppableId as ColumnKey;

    stageMutation.mutate({ userId, userType: newColumn });
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
      <div className="text-center py-20 text-red-500">
        {isEs ? "Error al cargar datos del CRM" : "Failed to load CRM data"}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {COLUMNS.map((col) => {
          const students = grouped[col.key];
          const label = isEs ? COLUMN_LABELS[col.key].es : COLUMN_LABELS[col.key].en;

          return (
            <div key={col.key} className="flex-shrink-0 w-[280px]">
              <div
                className="rounded-t-lg px-4 py-3 flex items-center justify-between"
                style={{ borderTop: `3px solid ${col.color}` }}
              >
                <h3 className="font-semibold text-sm text-gray-700">{label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {students.length}
                </Badge>
              </div>

              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 p-2 min-h-[500px] rounded-b-lg transition-colors ${
                      snapshot.isDraggingOver ? "bg-blue-50" : "bg-gray-50/50"
                    }`}
                  >
                    {students.map((student, index) => (
                      <Draggable
                        key={student.id}
                        draggableId={String(student.id)}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => onSelectStudent(student.id)}
                          >
                            <Card
                              className={`bg-white shadow-sm rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${
                                dragSnapshot.isDragging ? "shadow-lg ring-2 ring-[#1C7BB1]/30" : ""
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-1">
                                  <p className="font-medium text-sm text-gray-900 leading-tight">
                                    {student.firstName} {student.lastName}
                                  </p>
                                  {student.classCredits > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] shrink-0 border-[#1C7BB1] text-[#1C7BB1]"
                                    >
                                      {student.classCredits} {isEs ? "cr" : "cr"}
                                    </Badge>
                                  )}
                                </div>

                                <p className="text-xs text-gray-500 truncate">{student.email}</p>

                                {student.lastActivityAt && (
                                  <p className="text-[10px] text-gray-400">
                                    {isEs ? "Ultima act:" : "Last activity:"}{" "}
                                    {new Date(student.lastActivityAt).toLocaleDateString(
                                      isEs ? "es-CO" : "en-US",
                                      { month: "short", day: "numeric" }
                                    )}
                                  </p>
                                )}

                                {student.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {student.tags.map((tag) => (
                                      <span
                                        key={tag.id}
                                        className="inline-block text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                                        style={{ backgroundColor: tag.color }}
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
  );
}
