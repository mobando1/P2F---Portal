import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink } from "lucide-react";

/**
 * The daily operating view for the diagnostic funnel.
 *
 * One row per diagnostic class, booking → purchase. The filters are the actual
 * questions you ask each morning: who still needs a transcript, whose plan is
 * waiting on review, who got their plan and never opened it.
 *
 * "Sent and unopened" is the one worth watching — an unopened plan is a wasted
 * diagnostic, and it's recoverable with a nudge.
 */

interface Row {
  class_id: number;
  scheduled_at: string;
  class_status: string;
  class_category: string | null;
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  user_type: string;
  converted_to_customer_at: string | null;
  coach_name: string | null;
  goal: string | null;
  goal_category: string | null;
  self_level: string | null;
  transcript_words: number | null;
  plan_id: number | null;
  plan_status: string | null;
  plan_version: number | null;
  sent_at: string | null;
  first_viewed_at: string | null;
  recommended_tier: string | null;
}

type Filter =
  | "all"
  | "needs_transcript"
  | "needs_review"
  | "sent_unopened"
  | "opened_not_purchased"
  | "converted";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "needs_transcript", label: "Falta transcripción" },
  { id: "needs_review", label: "Falta revisar" },
  { id: "sent_unopened", label: "Enviado sin abrir" },
  { id: "opened_not_purchased", label: "Abierto sin comprar" },
  { id: "converted", label: "Convirtió" },
];

function matches(r: Row, f: Filter): boolean {
  const attended = r.class_status === "completed";
  switch (f) {
    case "needs_transcript":
      return attended && !r.transcript_words;
    case "needs_review":
      return r.plan_status === "draft";
    case "sent_unopened":
      return r.plan_status === "sent" && !r.first_viewed_at;
    case "opened_not_purchased":
      return !!r.first_viewed_at && !r.converted_to_customer_at;
    case "converted":
      return !!r.converted_to_customer_at;
    default:
      return true;
  }
}

export default function DiagnosticsTab() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ rows: Row[] }>({
    queryKey: ["admin-diagnostics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/diagnostics");
      if (!res.ok) throw new Error("Could not load diagnostics");
      return res.json();
    },
  });

  const rows = data?.rows ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of FILTERS) c[f.id] = rows.filter((r) => matches(r, f.id)).length;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matches(r, filter)) return false;
      if (!q) return true;
      return (
        `${r.first_name ?? ""} ${r.last_name ?? ""}`.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.coach_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  // The funnel, in one line. This is the measurement that says whether the
  // repositioning works.
  const funnel = useMemo(() => {
    const booked = rows.length;
    const attended = rows.filter((r) => r.class_status === "completed").length;
    const withTranscript = rows.filter((r) => r.transcript_words).length;
    const generated = rows.filter((r) => r.plan_id).length;
    const sent = rows.filter((r) => r.plan_status === "sent").length;
    const opened = rows.filter((r) => r.first_viewed_at).length;
    const purchased = rows.filter((r) => r.converted_to_customer_at).length;
    return { booked, attended, withTranscript, generated, sent, opened, purchased };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3 text-center">
            {[
              ["Reservó", funnel.booked],
              ["Asistió", funnel.attended],
              ["Transcripción", funnel.withTranscript],
              ["Plan generado", funnel.generated],
              ["Plan enviado", funnel.sent],
              ["Plan abierto", funnel.opened],
              ["Compró", funnel.purchased],
            ].map(([label, n]) => (
              <div key={label as string}>
                <div className="text-2xl font-bold">{n as number}</div>
                <div className="text-xs text-muted-foreground">{label as string}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <Badge variant="secondary" className="ml-2">{counts[f.id] ?? 0}</Badge>
          </Button>
        ))}
        <Input
          className="w-full sm:w-56 ml-auto"
          placeholder="Buscar por nombre, correo o coach"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr className="text-left">
                {["Estudiante", "Clase", "Coach", "Meta", "Transcr.", "Plan", "Abierto", "Tier", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                    Nada aquí.
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={r.class_id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="font-medium whitespace-nowrap">
                      {r.first_name} {r.last_name}
                      {r.converted_to_customer_at && (
                        <Badge className="ml-2 bg-green-600 hover:bg-green-600">cliente</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div>{new Date(r.scheduled_at).toLocaleDateString("es")}</div>
                    <div className="text-xs text-muted-foreground">{r.class_status}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.coach_name ?? "—"}</td>
                  <td className="px-3 py-2 max-w-[220px]">
                    {r.goal ? (
                      <span className="text-xs italic line-clamp-2" title={r.goal}>"{r.goal}"</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {r.transcript_words ? `${r.transcript_words} pal.` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.plan_status ? (
                      <Badge variant={r.plan_status === "sent" ? "default" : "outline"}>
                        {r.plan_status}
                        {r.plan_version && r.plan_version > 1 && ` v${r.plan_version}`}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {r.first_viewed_at ? (
                      new Date(r.first_viewed_at).toLocaleDateString("es")
                    ) : r.plan_status === "sent" ? (
                      <span className="text-amber-600">sin abrir</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{r.recommended_tier ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`/tutor-portal/diagnostic/${r.class_id}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
