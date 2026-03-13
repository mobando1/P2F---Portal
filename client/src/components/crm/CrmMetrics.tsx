import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import { Loader2, Users, UserCheck, UserPlus, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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

const STAGE_COLORS: Record<string, string> = {
  trial: "#1C7BB1",
  lead: "#F59E1C",
  negotiation: "#0A4A6E",
  customer: "#22c55e",
  inactive: "#94a3b8",
};

export default function CrmMetrics() {
  const { language } = useLanguage();
  const isEs = language === "es";

  const { data, isLoading, error } = useQuery<MetricsResponse>({
    queryKey: ["/api/admin/crm/metrics"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1C7BB1]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-10 text-red-500">
        {isEs ? "Error al cargar metricas" : "Failed to load metrics"}
      </div>
    );
  }

  const trialCount =
    data.funnel.find((s) => s.stage === "trial")?.count ?? 0;
  const customerCount =
    data.funnel.find((s) => s.stage === "customer")?.count ?? 0;

  const summaryCards = [
    {
      title: isEs ? "Total Estudiantes" : "Total Students",
      value: data.totalStudents,
      icon: Users,
      color: "#1C7BB1",
    },
    {
      title: isEs ? "En Prueba" : "Trial",
      value: trialCount,
      icon: UserPlus,
      color: "#F59E1C",
    },
    {
      title: isEs ? "Clientes" : "Customers",
      value: customerCount,
      icon: UserCheck,
      color: "#22c55e",
    },
    {
      title: isEs ? "Tasa de Conversion" : "Conversion Rate",
      value: `${data.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "#0A4A6E",
    },
  ];

  const chartData = data.funnel.map((stage) => ({
    name: stage.label,
    count: stage.count,
    stage: stage.stage,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="border-t-4" style={{ borderTopColor: card.color }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-5 w-5" style={{ color: card.color }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEs ? "Embudo de Conversion" : "Conversion Funnel"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={75}
                  tick={{ fontSize: 13 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    value,
                    isEs ? "Estudiantes" : "Students",
                  ]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={36}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.stage}
                      fill={STAGE_COLORS[entry.stage] ?? "#1C7BB1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
