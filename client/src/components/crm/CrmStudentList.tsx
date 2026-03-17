import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  Download,
  Users,
  UserPlus,
  UserCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

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

interface CrmStudentListProps {
  onSelectStudent: (userId: number) => void;
}

const TYPE_COLORS: Record<string, string> = {
  trial: "bg-[#1C7BB1]/10 text-[#1C7BB1] border-[#1C7BB1]/30",
  lead: "bg-[#F59E1C]/10 text-[#F59E1C] border-[#F59E1C]/30",
  negotiation: "bg-[#0A4A6E]/10 text-[#0A4A6E] border-[#0A4A6E]/30",
  customer: "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
};

const TYPE_LABELS: Record<string, { en: string; es: string }> = {
  trial: { en: "Trial", es: "Prueba" },
  lead: { en: "Lead", es: "Lead" },
  negotiation: { en: "Negotiation", es: "Negociacion" },
  customer: { en: "Customer", es: "Cliente" },
  inactive: { en: "Inactive", es: "Inactivo" },
};

export default function CrmStudentList({ onSelectStudent }: CrmStudentListProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<CrmStudent | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const queryParams = new URLSearchParams({ limit: "50" });
  if (search) queryParams.set("search", search);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const { data, isLoading, error } = useQuery<CrmResponse>({
    queryKey: [`/api/admin/crm?${queryParams.toString()}`],
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
      toast({
        title: isEs ? "Error al eliminar" : "Failed to delete",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    window.open("/api/admin/crm/export", "_blank");
  };

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        {isEs ? "Error al cargar estudiantes" : "Failed to load students"}
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-t-4 border-t-[#1C7BB1]">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {isEs ? "Total" : "Total"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-[#F59E1C]">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <UserPlus className="h-3.5 w-3.5" />
                {isEs ? "Prueba" : "Trial"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{summary.trial}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-[#0A4A6E]">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {isEs ? "Lead" : "Lead"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{summary.lead}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-green-500">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                {isEs ? "Clientes" : "Customers"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{summary.customer}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isEs ? "Buscar por nombre o email..." : "Search by name or email..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={isEs ? "Estado" : "Status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isEs ? "Todos" : "All"}</SelectItem>
            <SelectItem value="trial">{isEs ? "Prueba" : "Trial"}</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="negotiation">{isEs ? "Negociacion" : "Negotiation"}</SelectItem>
            <SelectItem value="customer">{isEs ? "Cliente" : "Customer"}</SelectItem>
            <SelectItem value="inactive">{isEs ? "Inactivo" : "Inactive"}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          CSV
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1C7BB1]" />
        </div>
      ) : !data || data.students.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          {isEs ? "No se encontraron estudiantes" : "No students found"}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">
                  {isEs ? "Nombre" : "Name"}
                </th>
                <th className="text-left py-3 px-4 font-medium">Email</th>
                <th className="text-left py-3 px-4 font-medium">
                  {isEs ? "Tipo" : "Type"}
                </th>
                <th className="text-center py-3 px-4 font-medium">
                  {isEs ? "Prueba" : "Trial"}
                </th>
                <th className="text-center py-3 px-4 font-medium">
                  {isEs ? "Creditos" : "Credits"}
                </th>
                <th className="text-center py-3 px-4 font-medium">
                  {isEs ? "Clases" : "Classes"}
                </th>
                <th className="text-left py-3 px-4 font-medium">Tags</th>
                <th className="text-left py-3 px-4 font-medium">
                  {isEs ? "Ultima Actividad" : "Last Activity"}
                </th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => {
                const typeStyle = TYPE_COLORS[student.userType] ?? TYPE_COLORS.inactive;
                const typeLabel = TYPE_LABELS[student.userType] ?? {
                  en: student.userType,
                  es: student.userType,
                };

                return (
                  <tr
                    key={student.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => onSelectStudent(student.id)}
                  >
                    <td className="py-3 px-4 font-medium">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {student.email}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={typeStyle}>
                        {isEs ? typeLabel.es : typeLabel.en}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.trialCompleted ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                          {isEs ? "Si" : "Yes"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.classCredits}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.completedClasses}/{student.totalClasses}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {student.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="text-xs py-0"
                            style={{
                              backgroundColor: `${tag.color}15`,
                              color: tag.color,
                              borderColor: `${tag.color}40`,
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {student.lastActivityAt
                        ? new Date(student.lastActivityAt).toLocaleDateString(
                            isEs ? "es-CO" : "en-US",
                            { month: "short", day: "numeric" }
                          )
                        : "-"}
                    </td>
                    <td className="py-3 px-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(student);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog — requires typing the student name */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmName(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isEs ? "Eliminar estudiante" : "Delete student"}
            </AlertDialogTitle>
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
              {deleteMutation.isPending
                ? (isEs ? "Eliminando..." : "Deleting...")
                : (isEs ? "Eliminar" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
