import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Save, Send, AlertTriangle, Quote, Plus, Trash2, ExternalLink,
} from "lucide-react";
import type { StudyPlan } from "@shared/study-plan-schema";

/**
 * Where the coach reads the generated plan and fixes it before the student
 * ever sees it.
 *
 * WHY THIS STEP EXISTS — it is not bureaucracy:
 *
 *  1. The plan IS the product. A hallucinated CEFR level or an invented quote
 *     in the student's very first artifact kills the sale in one shot.
 *  2. Manual Google Meet transcripts mis-attribute speakers ALL THE TIME. The
 *     model will sometimes quote something the coach said and credit it to the
 *     student. Only the person who was in the room can catch that — which is
 *     why the quotes are flagged below rather than buried in a form.
 *  3. It generates the gold data. Every coach edit is a labeled correction:
 *     `ai_content` keeps the untouched model output beside the edited
 *     `content`, and edit-distance over time is exactly what tells us when
 *     auto-send is safe. Without it we'd be guessing forever.
 *
 * So: generate → REVIEW → send. Sending is blocked until the coach saves.
 */

interface PlanResponse {
  id: number;
  classId: number;
  status: string;
  version: number;
  language: string;
  content: StudyPlan | null;
  studentFirstName: string;
  coachName: string | null;
  classDate: string;
  failureReason: string | null;
}

export default function TutorStudyPlanReviewPage() {
  const [, params] = useRoute("/tutor-portal/study-plan/:id");
  const planId = Number(params?.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [draft, setDraft] = useState<StudyPlan | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<PlanResponse>({
    queryKey: ["study-plan-review", planId],
    queryFn: async () => {
      const res = await fetch(`/api/tutor/study-plans/${planId}`);
      if (!res.ok) throw new Error("No se pudo cargar el plan");
      return res.json();
    },
    enabled: Number.isFinite(planId),
  });

  useEffect(() => {
    if (data?.content && !draft) setDraft(structuredClone(data.content));
  }, [data, draft]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tutor/study-plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "No se pudo guardar");
      return body;
    },
    onSuccess: () => {
      setDirty(false);
      toast({ title: "Guardado", description: "Ya puedes enviarlo." });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const send = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tutor/study-plans/${planId}/send`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "No se pudo enviar");
      return body;
    },
    onSuccess: () => {
      toast({ title: "Plan enviado", description: "El estudiante ya lo tiene en su correo." });
      navigate(`/tutor-portal/diagnostic/${data?.classId}`);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  function patch(fn: (d: StudyPlan) => void) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (data.status === "failed" || !draft) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardContent className="p-6 space-y-2">
            <h1 className="font-semibold">La generación falló</h1>
            <p className="text-sm text-muted-foreground">{data.failureReason ?? "Sin detalle."}</p>
            <Button variant="outline" onClick={() => navigate(`/tutor-portal/diagnostic/${data.classId}`)}>
              Volver a la clase
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alreadySent = data.status === "sent";
  const lowConfidence = (draft.confidence ?? 1) < 0.7;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-32">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Revisar el Plan de Vuelo</h1>
          <Badge variant={alreadySent ? "default" : "secondary"}>{data.status}</Badge>
          {data.version > 1 && <Badge variant="outline">v{data.version}</Badge>}
        </div>
        <p className="text-muted-foreground text-sm">
          {data.studentFirstName} · {new Date(data.classDate).toLocaleDateString("es")}
        </p>
      </header>

      {/* The model's own uncertainty, surfaced first — it tells the coach where
          to look hardest. Never shown to the student. */}
      {(lowConfidence || draft.generationNotes) && (
        <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Revisa con más cuidado
            </div>
            {lowConfidence && (
              <p className="text-sm">
                El modelo reportó confianza de {Math.round((draft.confidence ?? 0) * 100)}%. Suele
                pasar cuando la transcripción quedó corta o confusa.
              </p>
            )}
            {draft.generationNotes && (
              <p className="text-sm text-muted-foreground">{draft.generationNotes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* The known failure mode: Meet transcripts mis-attribute speakers, so a
          quote can be something the COACH said. Flagged, not buried. */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Quote className="w-4 h-4" />
            Verifica que esto lo dijo el estudiante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            La transcripción de Meet confunde quién habló con frecuencia. Tú estabas ahí; el
            modelo no.
          </p>
          <Field label="Su meta, en sus palabras" hint="Se cita textual en la página del plan y en el correo.">
            <Textarea
              rows={2}
              value={draft.goalInTheirWords}
              onChange={(e) => patch((d) => { d.goalInTheirWords = e.target.value; })}
            />
          </Field>
          {draft.diagnosis.evidence.map((ev, i) => (
            <div key={i} className="grid sm:grid-cols-2 gap-2 border-t pt-3">
              <Field label={`Observación ${i + 1}`}>
                <Textarea
                  rows={2}
                  value={ev.observation}
                  onChange={(e) => patch((d) => { d.diagnosis.evidence[i].observation = e.target.value; })}
                />
              </Field>
              <Field label="Cita del estudiante">
                <Textarea
                  rows={2}
                  value={ev.quote}
                  onChange={(e) => patch((d) => { d.diagnosis.evidence[i].quote = e.target.value; })}
                />
              </Field>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Encabezado y diagnóstico</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nombre del plan">
            <Input value={draft.headline} onChange={(e) => patch((d) => { d.headline = e.target.value; })} />
          </Field>
          <div className="grid sm:grid-cols-[120px_1fr] gap-4">
            <Field label="Nivel CEFR">
              <Input
                value={draft.diagnosis.cefrLevel}
                onChange={(e) => patch((d) => { d.diagnosis.cefrLevel = e.target.value as any; })}
              />
            </Field>
            <Field label="Resumen">
              <Textarea
                rows={3}
                value={draft.diagnosis.summary}
                onChange={(e) => patch((d) => { d.diagnosis.summary = e.target.value; })}
              />
            </Field>
          </div>
          <ListField
            label="En lo que ya está bien"
            items={draft.diagnosis.strengths}
            onChange={(items) => patch((d) => { d.diagnosis.strengths = items; })}
            min={1}
            max={4}
          />
          <Field label="Lo que lo está frenando">
            <Textarea rows={2} value={draft.blocker} onChange={(e) => patch((d) => { d.blocker = e.target.value; })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Áreas de enfoque</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {draft.focusAreas.map((f, i) => (
            <div key={i} className="space-y-3 border-b last:border-0 pb-4 last:pb-0">
              <Field label={`Área ${i + 1}`}>
                <Input value={f.title} onChange={(e) => patch((d) => { d.focusAreas[i].title = e.target.value; })} />
              </Field>
              <Field
                label="Por qué le importa a ÉL/ELLA"
                hint="Tiene que conectar con su meta, no con el inglés en general."
              >
                <Textarea
                  rows={2}
                  value={f.whyItMattersToYou}
                  onChange={(e) => patch((d) => { d.focusAreas[i].whyItMattersToYou = e.target.value; })}
                />
              </Field>
              <Field label="Qué van a hacer">
                <Textarea
                  rows={2}
                  value={f.whatWellDo}
                  onChange={(e) => patch((d) => { d.focusAreas[i].whatWellDo = e.target.value; })}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Hoy">
                  <Input value={f.currentState} onChange={(e) => patch((d) => { d.focusAreas[i].currentState = e.target.value; })} />
                </Field>
                <Field label="Meta">
                  <Input value={f.targetState} onChange={(e) => patch((d) => { d.focusAreas[i].targetState = e.target.value; })} />
                </Field>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Ruta semana a semana</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Cada hito debe poder responderse con sí o no. "Puedo abrir la reunión sin leer notas"
            sirve; "mejorar la fluidez" no — el estudiante lo va a marcar como cumplido.
          </p>
          {draft.weeklyOutline.map((w, i) => (
            <div key={i} className="space-y-3 border-b last:border-0 pb-4 last:pb-0">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Semanas">
                  <Input value={w.weekRange} onChange={(e) => patch((d) => { d.weeklyOutline[i].weekRange = e.target.value; })} />
                </Field>
                <Field label="Tema">
                  <Input value={w.theme} onChange={(e) => patch((d) => { d.weeklyOutline[i].theme = e.target.value; })} />
                </Field>
              </div>
              <ListField
                label="Objetivos"
                items={w.objectives}
                onChange={(items) => patch((d) => { d.weeklyOutline[i].objectives = items; })}
                min={1}
                max={4}
              />
              <Field label="Hito (primera persona, sí o no)">
                <Input value={w.milestone} onChange={(e) => patch((d) => { d.weeklyOutline[i].milestone = e.target.value; })} />
              </Field>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Recomendación</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Esto es lo que decide el precio. El tier se ajusta solo a la frecuencia al guardar.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Clases por semana">
              <Input
                type="number" min={1} max={3}
                value={draft.recommendation.sessionsPerWeek}
                onChange={(e) => patch((d) => {
                  const n = Math.min(3, Math.max(1, Number(e.target.value) || 1)) as 1 | 2 | 3;
                  d.recommendation.sessionsPerWeek = n;
                  d.recommendation.totalSessions = n * d.recommendation.durationWeeks;
                })}
              />
            </Field>
            <Field label="Semanas">
              <Input
                type="number" min={4} max={52}
                value={draft.recommendation.durationWeeks}
                onChange={(e) => patch((d) => {
                  const w = Math.min(52, Math.max(4, Number(e.target.value) || 4));
                  d.recommendation.durationWeeks = w;
                  d.recommendation.totalSessions = w * d.recommendation.sessionsPerWeek;
                })}
              />
            </Field>
            <Field label="Sesiones en total">
              <Input value={draft.recommendation.totalSessions} readOnly className="bg-muted" />
            </Field>
          </div>
          <Field label="Por qué esa frecuencia">
            <Textarea
              rows={3}
              value={draft.recommendation.rationale}
              onChange={(e) => patch((d) => { d.recommendation.rationale = e.target.value; })}
            />
          </Field>
          <Field label="A dónde lo lleva">
            <Textarea
              rows={2}
              value={draft.recommendation.expectedOutcome}
              onChange={(e) => patch((d) => { d.recommendation.expectedOutcome = e.target.value; })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Para empezar esta semana</CardTitle></CardHeader>
        <CardContent>
          <ListField
            label=""
            items={draft.quickWins}
            onChange={(items) => patch((d) => { d.quickWins = items; })}
            max={3}
          />
        </CardContent>
      </Card>

      {/* Sticky action bar — sending is blocked until the edits are saved, so a
          coach can't accidentally send the unreviewed draft. */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur p-4 z-40">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-3">
          {alreadySent ? (
            <span className="text-sm text-green-700 dark:text-green-500">Este plan ya fue enviado.</span>
          ) : (
            <>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar revisión
              </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => send.mutate()}
                disabled={send.isPending || dirty || data.status === "draft"}
              >
                {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar al estudiante
              </Button>
              <span className="text-xs text-muted-foreground">
                {dirty
                  ? "Guarda los cambios antes de enviar."
                  : data.status === "draft"
                    ? "Guarda la revisión para habilitar el envío."
                    : "Listo para enviar."}
              </span>
            </>
          )}
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <a href={`/tutor-portal/diagnostic/${data.classId}`}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Volver a la clase
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-sm">{label}</Label>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

/** Editable string list with add/remove, bounded by the schema's min/max. */
function ListField({
  label, items, onChange, min = 0, max = 10,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm">{label}</Label>}
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={items.length <= min}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Agregar
        </Button>
      )}
    </div>
  );
}
