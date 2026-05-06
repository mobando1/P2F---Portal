import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertCircle, TrendingUp } from "lucide-react";

interface AiCostData {
  available: boolean;
  budgets: { dailyUsd: number; monthlyUsd: number; perUserDailyUsd: number };
  totals: Record<string, { usd: number; calls: number }>;
  byFeature: { feature: string; usd: number; calls: number }[];
  byModel: { model: string; provider: string; usd: number; calls: number }[];
  topUsers: { userId: number; usd: number; calls: number }[];
}

const fmt = (n: number) => `$${n.toFixed(4)}`;

function ProgressBar({ value, max, danger }: { value: number; max: number; danger?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 100 ? "bg-red-500" : pct >= 50 ? "bg-orange-500" : "bg-emerald-500";
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div className={`${color} h-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AiCostTab({ isEs }: { isEs: boolean }) {
  const { data, isLoading } = useQuery<AiCostData>({
    queryKey: ["/api/admin/ai-cost"],
    refetchInterval: 60_000,
  });

  if (isLoading) return <p className="text-gray-500">{isEs ? "Cargando…" : "Loading…"}</p>;
  if (!data?.available) {
    return <p className="text-gray-500">{isEs ? "Datos de costo IA no disponibles." : "AI cost data unavailable."}</p>;
  }

  const today = data.totals.today || { usd: 0, calls: 0 };
  const month = data.totals.this_month || { usd: 0, calls: 0 };
  const blocked = data.totals.blocked_today || { usd: 0, calls: 0 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#1C7BB1]" />
              {isEs ? "Hoy" : "Today"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#0A4A6E]">{fmt(today.usd)}</p>
            <p className="text-xs text-gray-500 mb-2">{today.calls} {isEs ? "llamadas" : "calls"}</p>
            <ProgressBar value={today.usd} max={data.budgets.dailyUsd} />
            <p className="text-xs text-gray-500 mt-1">{isEs ? "Cap diario" : "Daily cap"}: ${data.budgets.dailyUsd.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#F59E1C]" />
              {isEs ? "Este mes" : "This month"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#0A4A6E]">{fmt(month.usd)}</p>
            <p className="text-xs text-gray-500 mb-2">{month.calls} {isEs ? "llamadas" : "calls"}</p>
            <ProgressBar value={month.usd} max={data.budgets.monthlyUsd} />
            <p className="text-xs text-gray-500 mt-1">{isEs ? "Cap mensual" : "Monthly cap"}: ${data.budgets.monthlyUsd.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className={`w-4 h-4 ${blocked.calls > 0 ? "text-red-500" : "text-gray-400"}`} />
              {isEs ? "Bloqueadas (24h)" : "Blocked (24h)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${blocked.calls > 0 ? "text-red-600" : "text-gray-700"}`}>{blocked.calls}</p>
            <p className="text-xs text-gray-500">
              {blocked.calls > 0
                ? (isEs ? "Llamadas detenidas por cap" : "Calls stopped by cap")
                : (isEs ? "Sin bloqueos" : "No blocks")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{isEs ? "Por feature (24h)" : "By feature (24h)"}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byFeature.length === 0 ? (
              <p className="text-sm text-gray-500">{isEs ? "Sin actividad" : "No activity"}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 border-b">
                  <tr><th className="py-2">{isEs ? "Feature" : "Feature"}</th><th>USD</th><th>{isEs ? "Llamadas" : "Calls"}</th></tr>
                </thead>
                <tbody>
                  {data.byFeature.map(r => (
                    <tr key={r.feature} className="border-b last:border-0">
                      <td className="py-2 font-medium text-[#0A4A6E]">{r.feature}</td>
                      <td>{fmt(r.usd)}</td>
                      <td className="text-gray-600">{r.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isEs ? "Por modelo (24h)" : "By model (24h)"}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byModel.length === 0 ? (
              <p className="text-sm text-gray-500">{isEs ? "Sin actividad" : "No activity"}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 border-b">
                  <tr><th className="py-2">{isEs ? "Modelo" : "Model"}</th><th>{isEs ? "Proveedor" : "Provider"}</th><th>USD</th><th>{isEs ? "Llamadas" : "Calls"}</th></tr>
                </thead>
                <tbody>
                  {data.byModel.map(r => (
                    <tr key={`${r.provider}-${r.model}`} className="border-b last:border-0">
                      <td className="py-2 font-medium text-[#0A4A6E]">{r.model}</td>
                      <td className="text-gray-600">{r.provider}</td>
                      <td>{fmt(r.usd)}</td>
                      <td className="text-gray-600">{r.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {data.topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{isEs ? "Top usuarios (24h)" : "Top users (24h)"}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b">
                <tr><th className="py-2">{isEs ? "Usuario ID" : "User ID"}</th><th>USD</th><th>{isEs ? "Llamadas" : "Calls"}</th><th>{isEs ? "Cap diario" : "Daily cap"}</th></tr>
              </thead>
              <tbody>
                {data.topUsers.map(r => (
                  <tr key={r.userId} className="border-b last:border-0">
                    <td className="py-2 font-medium text-[#0A4A6E]">#{r.userId}</td>
                    <td>{fmt(r.usd)}</td>
                    <td className="text-gray-600">{r.calls}</td>
                    <td>
                      <div className="w-32"><ProgressBar value={r.usd} max={data.budgets.perUserDailyUsd} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
