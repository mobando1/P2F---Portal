import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, UserPlus, TrendingUp, Clock, UserX } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { PageHeader } from "./ui/page-header";
import { StatCard } from "./ui/stat-card";
import { SectionCard } from "./ui/section-card";
import { TrendChart } from "./ui/trend-chart";
import { EmptyState } from "./ui/empty-state";
import { ErrorState } from "./ui/error-state";

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

interface InsightsResponse {
  bySource: { source: string; leads: number; customers: number; rate: number }[];
  avgDaysToConvert: number | null;
  trialNoShowRate: number | null;
}

export default function CrmMetrics() {
  const { language } = useLanguage();
  const isEs = language === "es";

  const { data, isLoading, error, refetch } = useQuery<MetricsResponse>({
    queryKey: ["/api/admin/crm/metrics"],
  });
  const { data: insights, isLoading: loadingInsights } = useQuery<InsightsResponse>({
    queryKey: ["/api/admin/crm/insights"],
  });

  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title={isEs ? "Métricas" : "Metrics"} />
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const trialCount = data?.funnel.find((s) => s.stage === "trial")?.count ?? 0;
  const customerCount = data?.funnel.find((s) => s.stage === "customer")?.count ?? 0;
  const chartData = (data?.funnel ?? []).map((stage) => ({ name: stage.label, count: stage.count }));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={isEs ? "Métricas" : "Metrics"}
        description={isEs ? "Embudo de conversión y salud del pipeline" : "Conversion funnel and pipeline health"}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={isEs ? "Total estudiantes" : "Total students"} value={data?.totalStudents ?? 0} icon={Users} loading={isLoading} accent="primary" />
        <StatCard label={isEs ? "En prueba" : "Trial"} value={trialCount} icon={UserPlus} loading={isLoading} accent="accent" />
        <StatCard label={isEs ? "Clientes" : "Customers"} value={customerCount} icon={UserCheck} loading={isLoading} accent="success" />
        <StatCard
          label={isEs ? "Tasa de conversión" : "Conversion rate"}
          value={data?.conversionRate ?? 0}
          format={(n) => `${n.toFixed(1)}%`}
          icon={TrendingUp}
          loading={isLoading}
          accent="success"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label={isEs ? "Días promedio a cliente" : "Avg. days to customer"}
          value={insights?.avgDaysToConvert ?? 0}
          format={(n) => `${n} ${isEs ? "días" : "days"}`}
          icon={Clock}
          loading={loadingInsights}
          accent="primary"
        />
        <StatCard
          label={isEs ? "No-show de trials" : "Trial no-show rate"}
          value={insights?.trialNoShowRate ?? 0}
          format={(n) => `${n}%`}
          icon={UserX}
          loading={loadingInsights}
          accent="accent"
          invertDelta
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={isEs ? "Embudo de conversión" : "Conversion funnel"} loading={isLoading}>
          {chartData.length > 0 ? (
            <TrendChart
              type="bar"
              data={chartData}
              series={[{ key: "count", label: isEs ? "Estudiantes" : "Students" }]}
              xKey="name"
              height={300}
            />
          ) : (
            <EmptyState icon={TrendingUp} size="sm" title={isEs ? "Sin datos" : "No data"} />
          )}
        </SectionCard>

        <SectionCard
          title={isEs ? "Conversión por fuente" : "Conversion by source"}
          description={isEs ? "Leads vs. clientes por canal" : "Leads vs. customers by channel"}
          loading={loadingInsights}
        >
          {insights?.bySource && insights.bySource.length > 0 ? (
            <TrendChart
              type="bar"
              data={insights.bySource}
              series={[
                { key: "leads", label: isEs ? "Leads" : "Leads" },
                { key: "customers", label: isEs ? "Clientes" : "Customers" },
              ]}
              xKey="source"
              height={300}
            />
          ) : (
            <EmptyState icon={Users} size="sm" title={isEs ? "Sin datos de fuente" : "No source data"} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
