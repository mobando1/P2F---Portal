import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, UserCheck, UserMinus, TrendingUp, Plus, Trash2, Download, Mail } from "lucide-react";

interface NewsletterSubscriber {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: string;
  status: string;
  userId: number | null;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

interface SubscribersResponse {
  subscribers: NewsletterSubscriber[];
  total: number;
  metrics: {
    total: number;
    active: number;
    unsubscribed: number;
    bounced: number;
    bySource: Record<string, number>;
  };
}

export default function SubscriberList() {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", firstName: "", lastName: "" });

  const { data, isLoading } = useQuery<SubscribersResponse>({
    queryKey: ["/api/admin/campaigns/subscribers", statusFilter, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      const res = await fetch(`/api/admin/campaigns/subscribers?${params}`, { credentials: "include" });
      return res.json();
    },
  });

  const subscribers = data?.subscribers ?? [];
  const metrics = data?.metrics ?? { total: 0, active: 0, unsubscribed: 0, bounced: 0, bySource: {} };

  const filtered = subscribers.filter(s =>
    !search ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.firstName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s.lastName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: (data: typeof addForm) =>
      apiRequest("POST", "/api/admin/campaigns/subscribers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns/subscribers"] });
      setAddOpen(false);
      setAddForm({ email: "", firstName: "", lastName: "" });
      toast({ title: isEs ? "Suscriptor agregado" : "Subscriber added" });
    },
    onError: () => {
      toast({ title: isEs ? "Error o email ya existe" : "Error or email already exists", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/campaigns/subscribers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns/subscribers"] });
    },
  });

  function exportCsv() {
    const rows = [
      ["Email", "First Name", "Last Name", "Source", "Status", "Subscribed At"],
      ...subscribers.map(s => [s.email, s.firstName ?? "", s.lastName ?? "", s.source, s.status, new Date(s.subscribedAt).toLocaleDateString()]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
  }

  const sourceData = [
    { name: isEs ? "Web" : "Website", value: metrics.bySource?.website ?? 0 },
    { name: isEs ? "Contacto" : "Contact Form", value: metrics.bySource?.contact_form ?? 0 },
    { name: isEs ? "Checkout" : "Checkout", value: metrics.bySource?.checkout ?? 0 },
    { name: isEs ? "Manual" : "Manual", value: metrics.bySource?.manual ?? 0 },
  ];

  const conversionRate = metrics.total > 0
    ? Math.round((subscribers.filter(s => s.userId).length / metrics.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">{isEs ? "Total" : "Total"}</span>
            </div>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">{isEs ? "Activos" : "Active"}</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{metrics.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserMinus className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">{isEs ? "Cancelados" : "Unsubscribed"}</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{metrics.unsubscribed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">{isEs ? "Conversión" : "Conversion"}</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{conversionRate}%</div>
            <div className="text-xs text-muted-foreground">{isEs ? "subs → usuarios" : "subs → users"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Source Breakdown Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{isEs ? "Suscriptores por Fuente" : "Subscribers by Source"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={sourceData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#1C7BB1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {isEs ? "Lista de Suscriptores" : "Subscriber List"}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="h-3.5 w-3.5 mr-1" />
                CSV
              </Button>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {isEs ? "Agregar" : "Add"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>{isEs ? "Agregar Suscriptor" : "Add Subscriber"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(addForm); }} className="space-y-3">
                    <div>
                      <Label>{isEs ? "Email *" : "Email *"}</Label>
                      <Input value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} type="email" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>{isEs ? "Nombre" : "First Name"}</Label>
                        <Input value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{isEs ? "Apellido" : "Last Name"}</Label>
                        <Input value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                      {isEs ? "Agregar" : "Add Subscriber"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Input
              placeholder={isEs ? "Buscar..." : "Search..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-sm max-w-48"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-sm w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isEs ? "Todos" : "All status"}</SelectItem>
                <SelectItem value="active">{isEs ? "Activos" : "Active"}</SelectItem>
                <SelectItem value="unsubscribed">{isEs ? "Cancelados" : "Unsubscribed"}</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-8 text-sm w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isEs ? "Todas las fuentes" : "All sources"}</SelectItem>
                <SelectItem value="website">{isEs ? "Web" : "Website"}</SelectItem>
                <SelectItem value="contact_form">{isEs ? "Formulario" : "Contact Form"}</SelectItem>
                <SelectItem value="checkout">Checkout</SelectItem>
                <SelectItem value="manual">{isEs ? "Manual" : "Manual"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">{isEs ? "Cargando..." : "Loading..."}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">{isEs ? "Sin suscriptores" : "No subscribers found"}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">{isEs ? "Nombre" : "Name"}</th>
                    <th className="text-left p-3 font-medium">{isEs ? "Fuente" : "Source"}</th>
                    <th className="text-left p-3 font-medium">{isEs ? "Fecha" : "Date"}</th>
                    <th className="text-left p-3 font-medium">{isEs ? "Estado" : "Status"}</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(sub => (
                    <tr key={sub.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{sub.email}</td>
                      <td className="p-3">{[sub.firstName, sub.lastName].filter(Boolean).join(" ") || "—"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {sub.source === "contact_form" ? (isEs ? "Formulario" : "Form") :
                           sub.source === "website" ? (isEs ? "Web" : "Web") :
                           sub.source === "checkout" ? "Checkout" : "Manual"}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(sub.subscribedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Badge variant={sub.status === "active" ? "default" : sub.status === "unsubscribed" ? "secondary" : "destructive"} className="text-xs">
                          {sub.status === "active" ? (isEs ? "Activo" : "Active") :
                           sub.status === "unsubscribed" ? (isEs ? "Cancelado" : "Unsub") : "Bounced"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(sub.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
