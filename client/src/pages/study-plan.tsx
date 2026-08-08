import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Quote, TrendingUp, CalendarRange, Gauge, CheckCircle2,
  Circle, Sparkles, ArrowRight, Lock,
} from "lucide-react";
import type { StudyPlan } from "@shared/study-plan-schema";
import { TIER_TO_PLAN_ID } from "@shared/study-plan-schema";

/**
 * The Flight Plan the student receives after their diagnostic class.
 *
 * PUBLIC — resolved by capability URL, not by login. The trial user has a
 * random UUID password they never chose; asking them to reset a password they
 * don't know they have, in order to read a free gift, loses most of them.
 *
 * It is a study plan AND a sales page, in that order. Everything the student
 * needs comes first; the recommendation sits near the end, after they've read
 * what they got for nothing. `quickWins` is deliberately the last block —
 * something free to act on this week, after the ask, not before it.
 */

interface PlanResponse {
  plan: Omit<StudyPlan, "generationNotes" | "confidence">;
  language: "es" | "en";
  studentFirstName: string;
  coachName: string | null;
  classDate: string | null;
  version: number;
  hasAccount: boolean;
}

const COPY = {
  es: {
    forYou: "Preparado para",
    by: "por",
    yourGoal: "Tu meta, en tus palabras",
    yourLevel: "Dónde estás hoy",
    strengths: "En lo que ya estás bien",
    evidence: "De tu propia clase",
    whatsStopping: "Lo que te está frenando",
    focusAreas: "Tus áreas de enfoque",
    whyForYou: "Por qué te importa a ti",
    whatWeDo: "Qué vamos a hacer",
    from: "Hoy",
    to: "Meta",
    route: "Tu ruta semana a semana",
    milestone: "Al terminar puedes decir:",
    checkpoints: "Cuándo volvemos a medir",
    afterClass: "Después de la clase",
    recommendation: "Lo que tu plan recomienda",
    perWeek: "clases por semana",
    forWeeks: "durante",
    weeks: "semanas",
    totalSessions: "sesiones en total",
    expected: "A dónde te lleva",
    cta: "Empezar mi plan",
    quickWins: "Empieza esta semana, sin pagar nada",
    yours: "Este plan es tuyo. Salió de lo que hablamos en tu clase de diagnóstico, y se queda contigo te inscribas o no.",
    saveTitle: "Guarda tu plan",
    saveBody: "Crea tu contraseña para volver a este plan cuando quieras y ver tu progreso.",
    savePlaceholder: "Elige una contraseña",
    saveCta: "Guardar mi plan",
    saved: "¡Listo! Ya puedes entrar a tu portal.",
    skills: {
      fluency: "Fluidez",
      listening: "Comprensión",
      lexicalRange: "Vocabulario",
      grammaticalAccuracy: "Gramática",
      confidence: "Confianza",
    },
    targetTask: {
      failed: "Todavía no",
      heavy_help: "Con mucha ayuda",
      partial: "Parcialmente",
      completed: "Sí, la completaste",
    },
    targetTaskLabel: "Tu tarea objetivo en la clase",
    notFound: "No encontramos este plan",
    notFoundBody: "El enlace puede estar incompleto. Revisa el correo que te enviamos o escríbenos.",
  },
  en: {
    forYou: "Prepared for",
    by: "by",
    yourGoal: "Your goal, in your words",
    yourLevel: "Where you are today",
    strengths: "What you're already good at",
    evidence: "From your own class",
    whatsStopping: "What's holding you back",
    focusAreas: "Your focus areas",
    whyForYou: "Why this matters to you",
    whatWeDo: "What we'll do",
    from: "Today",
    to: "Target",
    route: "Your week-by-week route",
    milestone: "When you finish you can say:",
    checkpoints: "When we measure again",
    afterClass: "After class",
    recommendation: "What your plan recommends",
    perWeek: "classes per week",
    forWeeks: "for",
    weeks: "weeks",
    totalSessions: "sessions total",
    expected: "Where it gets you",
    cta: "Start my plan",
    quickWins: "Start this week, without paying anything",
    yours: "This plan is yours. It came out of what we talked about in your diagnostic class, and you keep it whether or not you enroll.",
    saveTitle: "Save your plan",
    saveBody: "Create a password so you can come back to this plan any time and track your progress.",
    savePlaceholder: "Choose a password",
    saveCta: "Save my plan",
    saved: "Done! You can now sign in to your portal.",
    skills: {
      fluency: "Fluency",
      listening: "Listening",
      lexicalRange: "Vocabulary",
      grammaticalAccuracy: "Grammar",
      confidence: "Confidence",
    },
    targetTask: {
      failed: "Not yet",
      heavy_help: "With a lot of help",
      partial: "Partially",
      completed: "Yes, you did it",
    },
    targetTaskLabel: "Your target task in the class",
    notFound: "We couldn't find this plan",
    notFoundBody: "The link may be incomplete. Check the email we sent you, or write to us.",
  },
} as const;

export default function StudyPlanPage() {
  const [, params] = useRoute("/plan/:token");
  const token = params?.token;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  /** Local only — a student ticking a milestone shouldn't need an account. */
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const { data, isLoading, isError } = useQuery<PlanResponse>({
    queryKey: ["study-plan", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/study-plans/${token}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const claim = useMutation({
    mutationFn: async (pw: string) => {
      const res = await fetch(`/api/public/study-plans/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.saved });
      navigate("/dashboard");
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const lang = data?.language === "en" ? "en" : "es";
  const t = COPY[lang];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold mb-2">{COPY.es.notFound}</h1>
            <p className="text-muted-foreground text-sm">{COPY.es.notFoundBody}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const p = data.plan;
  const skills = [
    ["fluency", p.baseline.fluency],
    ["listening", p.baseline.listening],
    ["lexicalRange", p.baseline.lexicalRange],
    ["grammaticalAccuracy", p.baseline.grammaticalAccuracy],
    ["confidence", p.baseline.confidence],
  ] as const;

  const classDate = data.classDate
    ? new Date(data.classDate).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-background">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 space-y-10">

        {/* Header */}
        <header className="text-center space-y-3">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            {lang === "es" ? "Plan de Vuelo" : "Flight Plan"}
            {data.version > 1 && ` · v${data.version}`}
          </Badge>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{p.headline}</h1>
          <p className="text-sm text-muted-foreground">
            {t.forYou} <strong>{data.studentFirstName}</strong>
            {data.coachName && <> · {t.by} {data.coachName}</>}
            {classDate && <> · {classDate}</>}
          </p>
        </header>

        {/* Their goal, quoted back. Above the fold on purpose — this is the
            "they actually listened" moment and it carries the whole document. */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              <Quote className="w-4 h-4" />
              {t.yourGoal}
            </div>
            <blockquote className="text-lg md:text-xl italic leading-relaxed">
              "{p.goalInTheirWords}"
            </blockquote>
          </CardContent>
        </Card>

        {/* Measured level */}
        <section className="space-y-4">
          <SectionTitle icon={<Target className="w-4 h-4" />}>{t.yourLevel}</SectionTitle>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="text-base px-3 py-1">{p.diagnosis.cefrLevel}</Badge>
                <p className="text-sm text-muted-foreground flex-1">{p.diagnosis.summary}</p>
              </div>

              <div className="space-y-3">
                {skills.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm w-32 shrink-0">{t.skills[key]}</span>
                    <Progress value={value * 10} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{value}/10</span>
                  </div>
                ))}
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">{t.targetTaskLabel}: </span>
                <strong>{t.targetTask[p.baseline.targetTask]}</strong>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {t.strengths}
                </p>
                <ul className="space-y-1.5">
                  {p.diagnosis.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {p.diagnosis.evidence.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {t.evidence}
                  </p>
                  <div className="space-y-3">
                    {p.diagnosis.evidence.map((e, i) => (
                      <div key={i} className="text-sm border-l-2 border-muted pl-3">
                        <p>{e.observation}</p>
                        <p className="text-muted-foreground italic mt-1">"{e.quote}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Blocker */}
        <Card className="bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-500 mb-2">
              {t.whatsStopping}
            </p>
            <p className="text-sm">{p.blocker}</p>
          </CardContent>
        </Card>

        {/* Focus areas — whyItMattersToYou is typographically dominant over the
            pedagogy on purpose; it's what makes this not read like a template. */}
        <section className="space-y-4">
          <SectionTitle icon={<TrendingUp className="w-4 h-4" />}>{t.focusAreas}</SectionTitle>
          <div className="space-y-4">
            {p.focusAreas.map((f, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs font-mono text-muted-foreground">{i + 1}</span>
                    <h3 className="font-semibold text-lg">{f.title}</h3>
                  </div>
                  <p className="text-base">{f.whyItMattersToYou}</p>
                  <p className="text-sm text-muted-foreground">{f.whatWellDo}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs pt-2 border-t">
                    <span><span className="text-muted-foreground">{t.from}:</span> {f.currentState}</span>
                    <span><span className="text-muted-foreground">{t.to}:</span> {f.targetState}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Week-by-week, with checkable milestones. Binary and observable by
            schema constraint — that's what makes the plan executable. */}
        <section className="space-y-4">
          <SectionTitle icon={<CalendarRange className="w-4 h-4" />}>{t.route}</SectionTitle>
          <div className="space-y-3">
            {p.weeklyOutline.map((w, i) => {
              const done = checked.has(i);
              return (
                <Card key={i} className={done ? "border-green-500/50 bg-green-50/40 dark:bg-green-950/10" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-pressed={done}
                        onClick={() =>
                          setChecked((s) => {
                            const next = new Set(s);
                            next.has(i) ? next.delete(i) : next.add(i);
                            return next;
                          })
                        }
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-green-600 transition-colors"
                      >
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {w.weekRange}
                          </span>
                          <span className="font-semibold">{w.theme}</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {w.objectives.map((o) => (
                            <li key={o} className="flex gap-2">
                              <span className="text-muted-foreground/50">·</span>
                              {o}
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm pt-1">
                          <span className="text-muted-foreground">{t.milestone} </span>
                          <span className="font-medium">"{w.milestone}"</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Checkpoints — this is what turns "progress" from a feeling into a
            measurement the student can hold us to. */}
        {p.checkpoints.length > 0 && (
          <section className="space-y-4">
            <SectionTitle icon={<Gauge className="w-4 h-4" />}>{t.checkpoints}</SectionTitle>
            <Card>
              <CardContent className="p-6 space-y-3">
                {p.checkpoints.map((c) => (
                  <div key={c.afterClass} className="flex gap-3 text-sm">
                    <Badge variant="outline" className="shrink-0 h-6">
                      {t.afterClass} {c.afterClass}
                    </Badge>
                    <span className="text-muted-foreground">{c.whatWeRemeasure}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* The recommendation — frequency as a consequence of the diagnosis,
            not a menu the student picks from. */}
        <section className="space-y-4">
          <SectionTitle icon={<Gauge className="w-4 h-4" />}>{t.recommendation}</SectionTitle>
          <Card className="border-2 border-primary">
            <CardContent className="p-6 space-y-4">
              <div className="text-center py-2">
                <p className="text-3xl font-bold">
                  {p.recommendation.sessionsPerWeek} {t.perWeek}
                </p>
                <p className="text-muted-foreground">
                  {t.forWeeks} {p.recommendation.durationWeeks} {t.weeks} ·{" "}
                  {p.recommendation.totalSessions} {t.totalSessions}
                </p>
              </div>
              <p className="text-sm">{p.recommendation.rationale}</p>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  {t.expected}
                </p>
                <p className="text-sm">{p.recommendation.expectedOutcome}</p>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigate(`/checkout?plan=${TIER_TO_PLAN_ID[p.recommendation.planTier]}`)}
              >
                {t.cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Free value, deliberately AFTER the ask. */}
        {p.quickWins.length > 0 && (
          <section className="space-y-4">
            <SectionTitle icon={<Sparkles className="w-4 h-4" />}>{t.quickWins}</SectionTitle>
            <Card>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {p.quickWins.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="font-mono text-xs text-muted-foreground mt-0.5">{i + 1}</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        <p className="text-center text-sm text-muted-foreground max-w-xl mx-auto">{t.yours}</p>

        {/* Claim: one form, no email round-trip. This is how a trial user
            becomes an account without ever being asked to reset a password
            they never set. */}
        {!data.hasAccount && (
          <Card className="bg-muted/40">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">{t.saveTitle}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{t.saveBody}</p>
              <form
                className="flex flex-col sm:flex-row gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (password.length >= 8) claim.mutate(password);
                }}
              >
                <Input
                  type="password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.savePlaceholder}
                />
                <Button type="submit" disabled={claim.isPending || password.length < 8}>
                  {t.saveCta}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {children}
    </h2>
  );
}
