import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendSeries {
  key: string;
  label: string;
  /** Color CSS (default: token de marca por índice) */
  color?: string;
}

interface TrendChartProps {
  type?: "area" | "line" | "bar";
  data: Array<Record<string, any>>;
  series: TrendSeries[];
  xKey: string;
  height?: number;
  showGrid?: boolean;
  formatY?: (v: any) => string;
  formatX?: (v: any) => string;
  className?: string;
}

const BRAND_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Tooltip con estilo glass/marca, consistente claro-oscuro vía tokens. */
function BrandTooltip({ active, payload, label, formatY }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">
            {formatY ? formatY(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Wrapper de recharts con estilo de marca P2F + dark mode automático (tokens). */
export function TrendChart({
  type = "area",
  data,
  series,
  xKey,
  height = 280,
  showGrid = true,
  formatY,
  formatX,
  className,
}: TrendChartProps) {
  const axisProps = {
    tick: { fill: "var(--muted-foreground)", fontSize: 12 },
    axisLine: false,
    tickLine: false,
  };
  const grid = showGrid && (
    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
  );
  const tooltip = <Tooltip content={<BrandTooltip formatY={formatY} />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />;
  const color = (i: number, s: TrendSeries) => s.color ?? BRAND_COLORS[i % BRAND_COLORS.length];

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        {type === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color(i, s)} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color(i, s)} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            {grid}
            <XAxis dataKey={xKey} tickFormatter={formatX} {...axisProps} />
            <YAxis tickFormatter={formatY} width={48} {...axisProps} />
            {tooltip}
            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color(i, s)}
                strokeWidth={2.5}
                fill={`url(#grad-${s.key})`}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        ) : type === "line" ? (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey={xKey} tickFormatter={formatX} {...axisProps} />
            <YAxis tickFormatter={formatY} width={48} {...axisProps} />
            {tooltip}
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color(i, s)}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey={xKey} tickFormatter={formatX} {...axisProps} />
            <YAxis tickFormatter={formatY} width={48} {...axisProps} />
            {tooltip}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={color(i, s)} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
