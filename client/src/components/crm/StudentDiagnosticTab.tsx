import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, ExternalLink, Quote, FileText, Gauge, Eye, EyeOff, Send, Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * The diagnostic module inside a CRM contact.
 *
 * Answers, in one screen, the questions you actually ask about a contact:
 * what did they say they want, did the class happen, is the transcript in, was
 * a plan generated, was it sent, and — the one that matters most — did they
 * open it. A sent plan nobody opened is a wasted diagnostic and is recoverable
 * with a nudge; a sent plan they opened and didn't buy is a different
 * conversation entirely.
 */

interface PlanRow {
  id: number;
  class_id: number | null;
  version: number;
  status: string;
  language: string;
  sent_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  share_token: string | null;
  created_at: string;
  failure_reason: string | null;
  headline: string | null;
  cefr_level: string | null;
  goal: string | null;
  plan_tier: string | null;
  sessions_per_week: string | null;
  duration_weeks: string | null;
  scheduled_at: string | null;
  coach_name: string | null;
}

interface DiagnosticData {
  plans: PlanRow[];
  intake: {
    goal: string | null;
    goal_category: string | null;
    self_level: string | null;
    blocker: string | null;
    created_at: string;
  } | null;
  classes: {
    id: number;
    scheduled_at: string;
    status: string;
    coach_name: string | null;
    transcript_words: number | null;
    transcript_at: string | null;
    cefr_estimate: string | null;
    assessment_number: number | null;
  }[];
  assessments: {
    assessment_number: number;
    fluency: number | null;
    listening: number | null;
    lexical_range: number | null;
    grammatical_accuracy: number | null;
    confidence: number | null;
    target_task_result: string | null;
    cefr_estimate: string | null;
    created_at: string;
  }[];
}

const SKILLS = [
  ["fluency", "Fluidez"],
  ["listening", "Comprensión"],
  ["lexical_range", "Vocabulario"],
  ["grammatical_accuracy", "Gramática"],
  ["confidence", "Confianza"],
] as const;

const TIER_LABEL: Record<string, string> = {
  starter_flow: "Starter Flow",
  momentum_plan: "Momentum Plan",
  fluency_boost: "Fluency Boost",
};

export default function StudentDiagnosticTab({
  userId,
  isEs = true,
}: {
  userId: number;
  isEs?: boolean;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<DiagnosticData>({
    queryKey: ["crm-diagnostic", userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/crm/${userId}/diagnostic`);
      if (!res.ok) throw new Error("Could not load");
      return res.json();
    },
    enabled: Number.isFinite(userId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const plans = data?.plans ?? [];
  const classes = data?.classes ?? [];
  const assessments = data?.assessments ?? [];
  const active = plans.find((p) => p.status !== "superseded" && p.status !== "failed");

  if (!plans.length && !classes.length && !data?.intake) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {isEs
          ? "Este contacto todavía no ha tenido una clase de diagnóstico."
          : "This contact hasn't had a diagnostic class yet."}
      </p>
    );
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/plan/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: isEs ? "Enlace copiado" : "Link copied", description: url });
  };

  return (
    <div className="space-y-6">
      {/* What they told us at booking — their own words are the most useful
          thing on this screen for a sales conversation. */}
      {data?.intake && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5" />
            {isEs ? "Lo que dijo al reservar" : "What they said at booking"}
          </h4>
          {data.intake.goal && (
            <p className="text-sm italic border-l-2 border-primary pl-3">"{data.intake.goal}"</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {data.intake.goal_category && <Badge variant="outline">{data.intake.goal_category}</Badge>}
            {data.intake.self_level && (
              <Badge variant="outline">{isEs ? "se ubica en" : "self-rated"} {data.intake.self_level}</Badge>
            )}
            {data.intake.blocker && <Badge variant="outline">{data.intake.blocker}</Badge>}
          </div>
        </section>
      )}

      {/* The plan itself */}
      {active ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-sm font-semibold">{isEs ? "Plan de Vuelo" : "Flight Plan"}</h4>
            <div className="flex items-center gap-1.5">
              <Badge variant={active.status === "sent" ? "default" : "secondary"}>{active.status}</Badge>
              {active.version > 1 && <Badge variant="outline">v{active.version}</Badge>}
            </div>
          </div>

          {active.headline && <p className="text-sm font-medium">{active.headline}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {active.cefr_level && <span>{isEs ? "Nivel" : "Level"} {active.cefr_level}</span>}
            {active.plan_tier && <span>{TIER_LABEL[active.plan_tier] ?? active.plan_tier}</span>}
            {active.sessions_per_week && active.duration_weeks && (
              <span>
                {active.sessions_per_week}{isEs ? "×/sem · " : "×/wk · "}{active.duration_weeks}
                {isEs ? " semanas" : " weeks"}
              </span>
            )}
            {active.coach_name && <span>{isEs ? "Coach" : "Coach"}: {active.coach_name}</span>}
          </div>

          {/* Sent-and-opened is the signal worth acting on. */}
          <div className="rounded-lg border p-3 space-y-1.5 text-xs">
            <Row
              icon={<Send className="w-3.5 h-3.5" />}
              label={isEs ? "Enviado" : "Sent"}
              value={active.sent_at ? new Date(active.sent_at).toLocaleString(isEs ? "es" : "en") : "—"}
            />
            <Row
              icon={active.first_viewed_at ? <Eye className="w-3.5 h-3.5 text-green-600" /> : <EyeOff className="w-3.5 h-3.5 text-amber-600" />}
              label={isEs ? "Abierto" : "Opened"}
              value={
                active.first_viewed_at
                  ? `${new Date(active.first_viewed_at).toLocaleString(isEs ? "es" : "en")} · ${active.view_count}×`
                  : active.status === "sent"
                    ? (isEs ? "todavía no lo abre" : "not opened yet")
                    : "—"
              }
              warn={active.status === "sent" && !active.first_viewed_at}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {active.share_token && (
              <>
                <Button size="sm" variant="outline" asChild>
                  <a href={`/plan/${active.share_token}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    {isEs ? "Ver el plan" : "Open plan"}
                  </a>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copyLink(active.share_token!)}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {isEs ? "Copiar enlace" : "Copy link"}
                </Button>
              </>
            )}
            {active.class_id && (
              <Button size="sm" variant="ghost" asChild>
                <a href={`/tutor-portal/diagnostic/${active.class_id}`}>
                  {isEs ? "Panel del coach" : "Coach panel"}
                </a>
              </Button>
            )}
          </div>

          {active.failure_reason && (
            <p className="text-xs text-destructive">{active.failure_reason}</p>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isEs ? "Sin plan generado todavía." : "No plan generated yet."}
        </p>
      )}

      {/* Progress: the same five skills re-measured at classes 4, 8 and 12. */}
      {assessments.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" />
            {isEs ? "Mediciones" : "Measurements"}
          </h4>
          <div className="space-y-2">
            {SKILLS.map(([key, label]) => {
              const first = assessments[0]?.[key] ?? null;
              const last = assessments[assessments.length - 1]?.[key] ?? null;
              const moved = assessments.length > 1 && first !== null && last !== null && last !== first;
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
                  <Progress value={(last ?? 0) * 10} className="h-1.5 flex-1" />
                  <span className="w-14 text-right tabular-nums">
                    {first ?? "—"}
                    {moved && <span className="text-green-600"> → {last}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {assessments.length === 1
              ? (isEs ? "Solo la línea base. Se vuelve a medir en la clase 4." : "Baseline only. Re-measured at class 4.")
              : (isEs ? `${assessments.length} mediciones` : `${assessments.length} measurements`)}
          </p>
        </section>
      )}

      {/* Diagnostic classes and what each one is missing. */}
      {classes.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {isEs ? "Clases de diagnóstico" : "Diagnostic classes"}
          </h4>
          {classes.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-xs border rounded-lg p-2.5">
              <div className="min-w-0">
                <div className="font-medium">
                  {new Date(c.scheduled_at).toLocaleDateString(isEs ? "es" : "en")}
                  {c.coach_name && <span className="text-muted-foreground"> · {c.coach_name}</span>}
                </div>
                <div className="text-muted-foreground">
                  {c.status}
                  {c.transcript_words
                    ? ` · ${c.transcript_words} ${isEs ? "palabras" : "words"}`
                    : ` · ${isEs ? "sin transcripción" : "no transcript"}`}
                  {c.assessment_number ? ` · ${isEs ? "con rúbrica" : "rubric done"}` : ""}
                </div>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <a href={`/tutor-portal/diagnostic/${c.id}`}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </div>
          ))}
        </section>
      )}

      {/* Superseded versions, so an older plan the student may still have a
          link to is traceable. */}
      {plans.length > 1 && (
        <section className="space-y-1.5">
          <h4 className="text-sm font-semibold">{isEs ? "Versiones anteriores" : "Previous versions"}</h4>
          {plans.filter((p) => p.id !== active?.id).map((p) => (
            <div key={p.id} className="text-xs text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">v{p.version}</Badge>
              <span>{p.status}</span>
              <span>{new Date(p.created_at).toLocaleDateString(isEs ? "es" : "en")}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Row({
  icon, label, value, warn,
}: { icon: React.ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className={warn ? "text-amber-600 font-medium" : ""}>{value}</span>
    </div>
  );
}
