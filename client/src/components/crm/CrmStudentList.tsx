import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Search, Download, Users, UserPlus, UserCheck, Sparkles, Trash2, Inbox } from "lucide-react";
import { PageHeader } from "./ui/page-header";
import { StatCard } from "./ui/stat-card";
import { StatusBadge } from "./ui/status-badge";
import { DataTable, type Column } from "./ui/data-table";
import { EmptyState } from "./ui/empty-state";

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

const TYPE_LABELS: Record<string, { en: string; es: string }> = {
  trial: { en: "Trial", es: "Prueba" },
  lead: { en: "Lead", es: "Lead" },
  negotiation: { en: "Negotiation", es: "Negociación" },
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
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<CrmStudent | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const LIMIT = 50;
  const queryParams = new URLSearchParams({ limit: String(LIMIT), page: String(page) });
  if (search) queryParams.set("search", search);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const { data, isLoading, error } = useQuery<CrmResponse>({
    queryKey: [`/api/admin/crm?${queryParams.toString()}`],
  });

  const { data: allTags = [] } = useQuery<{ id: number; name: string; color: string }[]>({
    queryKey: ["/api/admin/crm/tags"],
  });

  const invalidateCrm = () =>
    queryClient.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/crm"),
    });

  const bulkMutation = useMutation({
    mutationFn: async (payload: { action: "stage" | "tag"; value: string }) => {
      await apiRequest("POST", "/api/admin/crm/bulk", { ids: Array.from(selected), ...payload });
    },
    onSuccess: (_d, payload) => {
      invalidateCrm();
      setSelected(new Set());
      toast({
        title: isEs ? "Acción aplicada" : "Action applied",
        description: payload.action === "stage" ? (isEs ? "Etapa actualizada" : "Stage updated") : (isEs ? "Tag añadido" : "Tag added"),
      });
    },
    onError: () => toast({ title: isEs ? "Error" : "Error", variant: "destructive" }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

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

  const handleExport = () => window.open("/api/admin/crm/export", "_blank");

  const summary = data?.summary;

  const columns: Column<CrmStudent>[] = [
    {
      key: "name",
      header: isEs ? "Nombre" : "Name",
      sortable: true,
      sortValue: (s) => `${s.firstName} ${s.lastName}`.toLowerCase(),
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {(s.firstName?.[0] ?? "") + (s.lastName?.[0] ?? "")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{s.firstName} {s.lastName}</p>
            <p className="truncate text-xs text-muted-foreground">{s.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "userType",
      header: isEs ? "Etapa" : "Stage",
      sortable: true,
      render: (s) => (
        <StatusBadge
          status={s.userType}
          variant="stage"
          label={isEs ? (TYPE_LABELS[s.userType]?.es ?? s.userType) : (TYPE_LABELS[s.userType]?.en ?? s.userType)}
        />
      ),
    },
    {
      key: "trialCompleted",
      header: isEs ? "Prueba" : "Trial",
      align: "center",
      render: (s) =>
        s.trialCompleted ? (
          <StatusBadge status="success" size="sm" dot={false} label={isEs ? "Sí" : "Yes"} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "classCredits",
      header: isEs ? "Créditos" : "Credits",
      align: "center",
      sortable: true,
      render: (s) => <span className="tabular-nums">{s.classCredits}</span>,
    },
    {
      key: "classes",
      header: isEs ? "Clases" : "Classes",
      align: "center",
      sortable: true,
      sortValue: (s) => s.completedClasses,
      render: (s) => (
        <span className="tabular-nums text-muted-foreground">
          {s.completedClasses}/{s.totalClasses}
        </span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (s) => (
        <div className="flex flex-wrap gap-1">
          {s.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "lastActivityAt",
      header: isEs ? "Última actividad" : "Last activity",
      sortable: true,
      sortValue: (s) => (s.lastActivityAt ? new Date(s.lastActivityAt).getTime() : 0),
      render: (s) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {s.lastActivityAt
            ? new Date(s.lastActivityAt).toLocaleDateString(isEs ? "es-CO" : "en-US", { month: "short", day: "numeric" })
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (s) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(s);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  if (error) {
    return (
      <div className="py-10 text-center text-destructive">
        {isEs ? "Error al cargar estudiantes" : "Failed to load students"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={isEs ? "Contactos" : "Contacts"}
        description={isEs ? "Todos tus leads y clientes" : "All your leads and customers"}
        actions={
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        }
      />

      {/* Summary */}
      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={isEs ? "Total" : "Total"} value={summary.total} icon={Users} accent="primary" />
          <StatCard label={isEs ? "Prueba" : "Trial"} value={summary.trial} icon={UserPlus} accent="primary" />
          <StatCard label="Lead" value={summary.lead} icon={Sparkles} accent="accent" />
          <StatCard label={isEs ? "Clientes" : "Customers"} value={summary.customer} icon={UserCheck} accent="success" />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isEs ? "Buscar por nombre o email..." : "Search by name or email..."}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={isEs ? "Estado" : "Status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isEs ? "Todos" : "All"}</SelectItem>
            <SelectItem value="trial">{isEs ? "Prueba" : "Trial"}</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="negotiation">{isEs ? "Negociación" : "Negotiation"}</SelectItem>
            <SelectItem value="customer">{isEs ? "Cliente" : "Customer"}</SelectItem>
            <SelectItem value="inactive">{isEs ? "Inactivo" : "Inactive"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions toolbar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {selected.size} {isEs ? "seleccionados" : "selected"}
          </span>
          <Select onValueChange={(v) => bulkMutation.mutate({ action: "stage", value: v })}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder={isEs ? "Cambiar etapa…" : "Change stage…"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">{isEs ? "Prueba" : "Trial"}</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="negotiation">{isEs ? "Negociación" : "Negotiation"}</SelectItem>
              <SelectItem value="customer">{isEs ? "Cliente" : "Customer"}</SelectItem>
              <SelectItem value="inactive">{isEs ? "Inactivo" : "Inactive"}</SelectItem>
            </SelectContent>
          </Select>
          {allTags.length > 0 && (
            <Select onValueChange={(v) => bulkMutation.mutate({ action: "tag", value: v })}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder={isEs ? "Añadir tag…" : "Add tag…"} />
              </SelectTrigger>
              <SelectContent>
                {allTags.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" onClick={() => setSelected(new Set())}>
            {isEs ? "Limpiar" : "Clear"}
          </Button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.students ?? []}
        rowKey={(s) => s.id}
        loading={isLoading}
        onRowClick={(s) => onSelectStudent(s.id)}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        emptyState={
          <EmptyState
            icon={Inbox}
            title={isEs ? "No se encontraron contactos" : "No contacts found"}
            description={isEs ? "Ajusta los filtros o agrega nuevos leads." : "Adjust the filters or add new leads."}
          />
        }
      />

      {/* Pagination */}
      {data && data.total > LIMIT && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isEs ? "Página" : "Page"} {page} {isEs ? "de" : "of"} {totalPages} · {data.total} {isEs ? "contactos" : "contacts"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {isEs ? "Anterior" : "Previous"}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              {isEs ? "Siguiente" : "Next"}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog — requires typing the student name */}
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
