import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, FileText, Gauge, Sparkles, Send, CheckCircle2,
  AlertTriangle, Loader2, Quote,
} from "lucide-react";

/**
 * The coach's workspace for a diagnostic class.
 *
 * Four steps in the order they actually happen: read the briefing before the
 * class, paste the transcript after it, score the rubric, then generate and
 * send the plan.
 *
 * Generation is explicitly a button, not a side effect of saving the
 * transcript — a bad paste would otherwise burn tokens and produce a draft
 * someone has to notice and discard. The coach is the only person who knows
 * whether the transcript is complete.
 */

interface Briefing {
  classId: number;
  isDiagnostic: boolean;
  student: { firstName: string; email: string; phone: string | null; level: string | null } | null;
  intake: {
    goal: string | null;
    goalCategory: string | null;
    selfLevel: string | null;
    blocker: string | null;
    summary: string;
  } | null;
  hasTranscript: boolean;
  transcripts: { id: number; source: string; wordCount: number; createdAt: string }[];
  planStatus: string | null;
  planId: number | null;
}

interface ScriptBlock {
  id: string;
  minuteStart: number;
  minuteEnd: number;
  title: string;
  marker: string;
  produces: string[];
  coachNotes: string;
}

const SKILLS = [
  { key: "fluency", label: "Fluidez", from: "muestra libre" },
  { key: "listening", label: "Comprensión auditiva", from: "bloque de escucha" },
  { key: "lexicalRange", label: "Rango léxico", from: "muestra libre" },
  { key: "grammaticalAccuracy", label: "Precisión gramatical", from: "tarea objetivo" },
  { key: "confidence", label: "Confianza al hablar", from: "tarea objetivo" },
] as const;

const TARGET_TASK = [
  { id: "failed", label: "No la completó" },
  { id: "heavy_help", label: "Con mucha ayuda" },
  { id: "partial", label: "Parcialmente" },
  { id: "completed", label: "Sí la completó" },
] as const;

export default function TutorDiagnosticPage() {
  const [, params] = useRoute("/tutor-portal/diagnostic/:classId");
  const classId = Number(params?.classId);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [transcript, setTranscript] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({
    fluency: 5, listening: 5, lexicalRange: 5, grammaticalAccuracy: 5, confidence: 5,
  });
  const [targetTask, setTargetTask] = useState<string>("partial");
  const [cefr, setCefr] = useState("");
  const [notes, setNotes] = useState("");

  const { data: briefing, isLoading } = useQuery<Briefing>({
    queryKey: ["briefing", classId],
    queryFn: async () => {
      const res = await fetch(`/api/tutor/classes/${classId}/briefing`);
      if (!res.ok) throw new Error("Could not load the briefing");
      return res.json();
    },
    enabled: Number.isFinite(classId),
  });

  const { data: script } = useQuery<{ blocks: ScriptBlock[]; rules: string[]; closing: string }>({
    queryKey: ["diagnostic-script"],
    queryFn: async () => {
      const res = await fetch("/api/tutor/diagnostic-script?lang=es");
      if (!res.ok) throw new Error("Could not load the protocol");
      return res.json();
    },
  });

  const { data: assessment } = useQuery<{ current: any }>({
    queryKey: ["assessment", classId],
    queryFn: async () => {
      const res = await fetch(`/api/tutor/classes/${classId}/assessment`);
      if (!res.ok) throw new Error("no assessment");
      return res.json();
    },
    enabled: Number.isFinite(classId),
    retry: false,
  });

  const saveTranscript = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tutor/classes/${classId}/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: transcript }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(body.message || "Error"), { code: body.code });
      return body;
    },
    onSuccess: (b) => {
      toast({
        title: "Transcripción guardada",
        description: `${b.wordCount} palabras · ${b.blocksDetected?.length ?? 0} bloques del protocolo detectados`,
      });
      setTranscript("");
      qc.invalidateQueries({ queryKey: ["briefing", classId] });
    },
    onError: (e: any) => {
      toast({
        title: e.code === "consent_missing" ? "Falta el consentimiento" : "No se pudo guardar",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const saveAssessment = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tutor/classes/${classId}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scores,
          targetTaskResult: targetTask,
          cefrEstimate: cefr || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar la rúbrica");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rúbrica guardada" });
      qc.invalidateQueries({ queryKey: ["assessment", classId] });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const generate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tutor/classes/${classId}/study-plan/generate`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "No se pudo generar el plan");
      return body;
    },
    onSuccess: () => {
      toast({ title: "Plan generado", description: "Revísalo antes de enviarlo." });
      qc.invalidateQueries({ queryKey: ["briefing", classId] });
    },
    onError: (e: any) => toast({ title: "Error al generar", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!briefing) {
    return <div className="p-8 text-center text-muted-foreground">No se encontró esta clase.</div>;
  }

  const hasRubric = !!assessment?.current;
  const canGenerate = briefing.hasTranscript && hasRubric;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Clase de Diagnóstico</h1>
          {briefing.planStatus && <Badge variant="secondary">{briefing.planStatus}</Badge>}
        </div>
        {briefing.student && (
          <p className="text-muted-foreground">
            {briefing.student.firstName} · {briefing.student.email}
            {briefing.student.phone && ` · ${briefing.student.phone}`}
          </p>
        )}
      </header>

      {/* 1 — Briefing. What they told us, before you walk in. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4" />
            1. Antes de la clase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {briefing.intake ? (
            <>
              {briefing.intake.goal && (
                <div className="border-l-4 border-primary bg-muted/40 p-4 rounded-r">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    <Quote className="w-3 h-3" />
                    Lo que escribió al reservar
                  </div>
                  <p className="italic">"{briefing.intake.goal}"</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Este es el escenario que dramatizas en el bloque 4.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-sm">
                {briefing.intake.goalCategory && <Badge variant="outline">Meta: {briefing.intake.goalCategory}</Badge>}
                {briefing.intake.selfLevel && <Badge variant="outline">Se ubica en: {briefing.intake.selfLevel}</Badge>}
                {briefing.intake.blocker && <Badge variant="outline">Le cuesta: {briefing.intake.blocker}</Badge>}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Este estudiante reservó antes de que existieran las preguntas, o las omitió.
              Cubre el bloque 1 con más calma.
            </p>
          )}

          {script && (
            <Accordion type="single" collapsible>
              <AccordionItem value="protocol">
                <AccordionTrigger className="text-sm">
                  Protocolo de los 50 minutos ({script.blocks.length} bloques)
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {script.blocks.map((b, i) => (
                    <div key={b.id} className="border-b last:border-0 pb-3 last:pb-0">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        {b.minuteStart}–{b.minuteEnd} min
                      </div>
                      <div className="font-semibold text-sm">{i + 1}. {b.title}</div>
                      {/* The marker phrase is the interface: transcripts are
                          segmented by matching it, so it is said verbatim. */}
                      <p className="text-sm mt-1">
                        Dices: <em className="text-primary">"{b.marker}"</em>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{b.coachNotes}</p>
                    </div>
                  ))}
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2">Reglas</p>
                    <ul className="text-sm space-y-1">
                      {script.rules.map((r, i) => (
                        <li key={i}>{i + 1}. {r}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* 2 — Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            2. Transcripción
            {briefing.hasTranscript && <CheckCircle2 className="w-4 h-4 text-green-600" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {briefing.transcripts.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {briefing.transcripts.length} versión(es) guardada(s) · última:{" "}
              {briefing.transcripts[0].wordCount} palabras
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Baja la transcripción de la grabación de Google Meet y pégala aquí. Si no la
            tienes, la grabación sirve igual — súbela a Meet o a Docs y copia el texto.
          </p>
          <Textarea
            rows={10}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Pega aquí la transcripción completa de la clase..."
            className="font-mono text-xs"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {transcript.trim().split(/\s+/).filter(Boolean).length} palabras
            </span>
            <Button
              onClick={() => saveTranscript.mutate()}
              disabled={transcript.trim().length < 200 || saveTranscript.isPending}
            >
              {saveTranscript.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar transcripción
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3 — Rubric. This is where "see your progress" comes from. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="w-4 h-4" />
            3. Rúbrica
            {hasRubric && <CheckCircle2 className="w-4 h-4 text-green-600" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            60 segundos. Estos números son la línea base contra la que vamos a medir el
            progreso en las clases 4, 8 y 12.
          </p>

          {SKILLS.map((s) => (
            <div key={s.key} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label className="text-sm">
                  {s.label}
                  <span className="text-xs text-muted-foreground ml-2">({s.from})</span>
                </Label>
                <span className="text-sm font-mono font-semibold">{scores[s.key]}</span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[scores[s.key]]}
                onValueChange={([v]) => setScores((prev) => ({ ...prev, [s.key]: v }))}
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-sm">
              La tarea objetivo del bloque 4 — ¿la completó?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {TARGET_TASK.map((o) => (
                <Button
                  key={o.id}
                  type="button"
                  variant={targetTask === o.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTargetTask(o.id)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Nivel CEFR estimado</Label>
              <Input value={cefr} onChange={(e) => setCefr(e.target.value)} placeholder="B1" maxLength={8} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Notas (opcional)</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lo que no cabe en un número."
            />
          </div>

          <Button onClick={() => saveAssessment.mutate()} disabled={saveAssessment.isPending}>
            {saveAssessment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar rúbrica
          </Button>
        </CardContent>
      </Card>

      {/* 4 — Generate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4" />
            4. Plan de Vuelo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canGenerate && (
            <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <span>
                Falta {!briefing.hasTranscript && "la transcripción"}
                {!briefing.hasTranscript && !hasRubric && " y "}
                {!hasRubric && "la rúbrica"} antes de generar.
              </span>
            </div>
          )}

          {briefing.planStatus === "sent" ? (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              Plan enviado al estudiante.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => generate.mutate()} disabled={!canGenerate || generate.isPending}>
                {generate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {briefing.planStatus ? "Regenerar" : "Generar plan"}
              </Button>
              {briefing.planId && (
                <Button variant="outline" asChild>
                  <a href={`/tutor/study-plan/${briefing.planId}`}>
                    <Send className="w-4 h-4 mr-2" />
                    Revisar y enviar
                  </a>
                </Button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            El plan se genera como borrador. Revísalo antes de enviarlo — la transcripción
            de Meet a veces confunde quién dijo qué, y eso se nota en las citas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
