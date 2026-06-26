import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  DollarSign,
  UserCheck,
  ArrowRight,
  CheckSquare,
  CalendarClock,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/i18n";
import { PageHeader } from "./ui/page-header";
import { StatCard } from "./ui/stat-card";
import { SectionCard } from "./ui/section-card";
import { StatusBadge } from "./ui/status-badge";
import { EmptyState } from "./ui/empty-state";
import { TrendChart } from "./ui/trend-chart";
import { listItem, listStagger } from "@/lib/animations";

interface FunnelStage {
  stage: string;
  count: number;
  label: string;
}
interface MetricsResponse {
  totalStudents: number;
  conversionRate: number;
  funnel: FunnelStage[];
}
interface StripeMetrics {
  mrr: number;
  mrrTrend: { month: string; mrr: number }[];
  churnRate: number;
}
interface CrmTask {
  id: number;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
}
interface RecentContact {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  lastActivityAt: string | null;
}

const STAGE_LABEL: Record<string, { es: string; en: string }> = {
  trial: { es: "Prueba", en: "Trial" },
  lead: { es: "Lead", en: "Lead" },
  negotiation: { es: "Negociación", en: "Negotiation" },
  customer: { es: "Cliente", en: "Customer" },
  inactive: { es: "Inactivo", en: "Inactive" },
};

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function CrmOverview() {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [, setLocation] = useLocation();

  const { data: metrics, isLoading: loadingMetrics } = useQuery<MetricsResponse>({
    queryKey: ["/api/admin/crm/metrics"],
  });
  const { data: stripe, isLoading: loadingStripe } = useQuery<StripeMetrics>({
    queryKey: ["/api/admin/analytics/stripe-metrics"],
  });
  const { data: tasks = [], isLoading: loadingTasks } = useQuery<CrmTask[]>({
    queryKey: ["/api/admin/crm/tasks?status=pending"],
  });
  const { data: recent } = useQuery<{ students: RecentContact[] }>({
    queryKey: ["/api/admin/crm?limit=6"],
  });

  const funnel = metrics?.funnel ?? [];
  const count = (stage: string) => funnel.find((f) => f.stage === stage)?.count ?? 0;
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));
  const recentContacts = recent?.students ?? [];

  const trendData = (stripe?.mrrTrend ?? []).map((p) => ({ month: p.month, mrr: p.mrr }));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        description={isEs ? "Resumen de tu pipeline y crecimiento" : "Overview of your pipeline and growth"}
        actions={
          <Button onClick={() => setLocation("/admin/crm/pipeline")} className="gap-2">
            {isEs ? "Ver pipeline" : "View pipeline"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      {/* KPIs */}
      <motion.div
        variants={listStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label={isEs ? "Total contactos" : "Total contacts"}
          value={metrics?.totalStudents ?? 0}
          icon={Users}
          loading={loadingMetrics}
          accent="primary"
        />
        <StatCard
          label={isEs ? "Conversión" : "Conversion"}
          value={metrics?.conversionRate ?? 0}
          format={(n) => `${n.toFixed(1)}%`}
          icon={TrendingUp}
          loading={loadingMetrics}
          accent="success"
        />
        <StatCard
          label="MRR"
          value={stripe?.mrr ?? 0}
          format={usd}
          icon={DollarSign}
          loading={loadingStripe}
          accent="accent"
        />
        <StatCard
          label={isEs ? "Clientes activos" : "Active customers"}
          value={count("customer")}
          icon={UserCheck}
          loading={loadingMetrics}
          accent="success"
        />
      </motion.div>

      {/* Bento grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* MRR trend (wide) */}
        <SectionCard
          title={isEs ? "Tendencia de ingresos (MRR)" : "Revenue trend (MRR)"}
          description={
            stripe?.churnRate !== undefined
              ? `${isEs ? "Churn" : "Churn"}: ${stripe.churnRate}%`
              : undefined
          }
          loading={loadingStripe}
          className="lg:col-span-2"
        >
          {trendData.length > 0 ? (
            <TrendChart
              type="area"
              data={trendData}
              series={[{ key: "mrr", label: "MRR" }]}
              xKey="month"
              height={260}
              formatY={(v) => usd(Number(v))}
            />
          ) : (
            <EmptyState
              icon={DollarSign}
              size="sm"
              title={isEs ? "Sin datos de ingresos" : "No revenue data"}
              description={isEs ? "Aparecerán al haber suscripciones activas." : "Will appear once subscriptions are active."}
            />
          )}
        </SectionCard>

        {/* Pipeline breakdown */}
        <SectionCard
          title={isEs ? "Pipeline" : "Pipeline"}
          action={
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setLocation("/admin/crm/pipeline")}>
              {isEs ? "Abrir" : "Open"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
          loading={loadingMetrics}
        >
          <div className="space-y-3">
            {["trial", "lead", "negotiation", "customer", "inactive"].map((stage) => {
              const c = count(stage);
              const pct = Math.round((c / maxFunnel) * 100);
              return (
                <div key={stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <StatusBadge
                      status={stage}
                      variant="stage"
                      size="sm"
                      label={isEs ? STAGE_LABEL[stage].es : STAGE_LABEL[stage].en}
                    />
                    <span className="font-display font-semibold tabular-nums text-foreground">{c}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Pending tasks */}
        <SectionCard
          title={isEs ? "Tareas pendientes" : "Pending tasks"}
          action={
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setLocation("/admin/crm/tasks")}>
              {isEs ? "Todas" : "All"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
          loading={loadingTasks}
        >
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              size="sm"
              title={isEs ? "Todo al día" : "All caught up"}
              description={isEs ? "No hay tareas pendientes." : "No pending tasks."}
            />
          ) : (
            <ul className="space-y-2">
              {tasks.slice(0, 5).map((task) => {
                const overdue = new Date(task.dueDate) < new Date();
                return (
                  <li key={task.id} className="flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-muted/50">
                    <CalendarClock className={`mt-0.5 h-4 w-4 shrink-0 ${overdue ? "text-destructive" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                      <p className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {new Date(task.dueDate).toLocaleDateString(isEs ? "es-CO" : "en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <StatusBadge status={task.priority === "high" ? "danger" : task.priority === "low" ? "neutral" : "warning"} size="sm" dot={false} label={task.priority} />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Recent contacts (wide) */}
        <SectionCard
          title={isEs ? "Contactos recientes" : "Recent contacts"}
          action={
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setLocation("/admin/crm/contacts")}>
              {isEs ? "Ver todos" : "View all"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
          className="lg:col-span-2"
        >
          {recentContacts.length === 0 ? (
            <EmptyState icon={Inbox} size="sm" title={isEs ? "Sin contactos aún" : "No contacts yet"} />
          ) : (
            <motion.ul variants={listStagger} initial="hidden" animate="visible" className="divide-y divide-border/60">
              {recentContacts.map((c) => (
                <motion.li
                  key={c.id}
                  variants={listItem}
                  onClick={() => setLocation(`/admin/crm/contacts/${c.id}`)}
                  className="flex cursor-pointer items-center gap-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {(c.firstName?.[0] ?? "") + (c.lastName?.[0] ?? "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  <StatusBadge status={c.userType} variant="stage" size="sm" />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
