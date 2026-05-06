import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { goldFileSchema, summaryOutputSchema, type GoldFile, type EvalRun, type EvalScore } from "./lib/types";
import { rougeL } from "./lib/rouge";

const ROOT = path.resolve(import.meta.dirname);
const GOLD_DIR = path.join(ROOT, "gold");
const PROMPTS_DIR = path.join(ROOT, "prompts");
const RUNS_DIR = path.join(ROOT, "runs");
const RESULTS_DIR = path.join(ROOT, "results");

const ACTIVE_PROMPT_VERSION = process.env.EVAL_PROMPT_VERSION || "v1";
const MODEL = process.env.EVAL_MODEL || "claude-haiku-4-5";
const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || "claude-haiku-4-5";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY not set. Add it to .env or export before running.");
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey });

interface AnthropicUsage { input_tokens: number; output_tokens: number }

function pricePerCall(model: string, usage: AnthropicUsage): number {
  const pricing: Record<string, { in: number; out: number }> = {
    "claude-haiku-4-5": { in: 1.0, out: 5.0 },
    "claude-sonnet-4-6": { in: 3.0, out: 15.0 },
  };
  const p = pricing[model];
  if (!p) return 0;
  return (usage.input_tokens / 1_000_000) * p.in + (usage.output_tokens / 1_000_000) * p.out;
}

function renderPrompt(template: string, gold: GoldFile): string {
  const transcriptLines = gold.input.diarizedTranscript
    .map(t => `[${t.timestamp}] ${t.speaker.toUpperCase()}: ${t.text}`)
    .join("\n");
  return template
    .replace(/\{\{studentName\}\}/g, gold.input.studentName)
    .replace(/\{\{studentLevel\}\}/g, gold.input.studentLevel)
    .replace(/\{\{tutorName\}\}/g, gold.input.tutorName)
    .replace(/\{\{targetLanguage\}\}/g, gold.input.targetLanguage)
    .replace(/\{\{uiLanguage\}\}/g, gold.input.uiLanguage)
    .replace(/\{\{durationMinutes\}\}/g, String(gold.input.durationMinutes))
    .replace(/\{\{recurringErrorsContext\}\}/g, gold.input.recurringErrorsContext.length > 0
      ? gold.input.recurringErrorsContext.map(e => `- ${e}`).join("\n")
      : "(none)")
    .replace(/\{\{diarizedTranscript\}\}/g, transcriptLines);
}

async function loadGolds(): Promise<GoldFile[]> {
  const files = await readdir(GOLD_DIR);
  const out: GoldFile[] = [];
  for (const f of files.filter(x => x.endsWith(".json"))) {
    const raw = JSON.parse(await readFile(path.join(GOLD_DIR, f), "utf-8"));
    const parsed = goldFileSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`Gold ${f} failed schema validation:`, parsed.error.issues.slice(0, 3));
      continue;
    }
    out.push(parsed.data);
  }
  return out;
}

async function generateSummary(gold: GoldFile, promptTemplate: string): Promise<{
  output: any;
  raw: string;
  usage: AnthropicUsage;
  costUsd: number;
}> {
  const prompt = renderPrompt(promptTemplate, gold);
  const t0 = Date.now();
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: "You output only valid JSON conforming to the requested schema. No preamble. No markdown.",
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "";
  // Strip optional leading code fence
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: any;
  try { parsed = JSON.parse(cleaned); } catch { parsed = null; }
  return { output: parsed, raw: cleaned, usage: res.usage as AnthropicUsage, costUsd: pricePerCall(MODEL, res.usage as AnthropicUsage) };
}

async function judgeFidelity(transcript: string, generated: any, expected: any): Promise<{ score: number; usage: AnthropicUsage; costUsd: number }> {
  const judgePrompt = `You are a strict evaluator of language-class summaries.

Below is a class transcript, the IDEAL summary written by an expert tutor, and a CANDIDATE summary produced by an AI.

Score the CANDIDATE on a scale 0-10 for OVERALL FIDELITY to the transcript and overlap with the IDEAL.

Criteria:
- Did it capture the actual key moments? (3 points)
- Were errors detected accurate to what was actually said? (3 points)
- Are vocab items real (present in transcript) and well chosen? (1 point)
- Are skill scores plausible given level + transcript? (1 point)
- Is homework relevant to what was taught? (1 point)
- Is the tone of shared_notes vs tutor_private_notes appropriate? (1 point)

Penalize fabrication harshly. Reward faithfulness.

Reply with ONLY a number 0-10 (decimals allowed). No explanation.

TRANSCRIPT:
${transcript}

IDEAL:
${JSON.stringify(expected, null, 2)}

CANDIDATE:
${JSON.stringify(generated, null, 2)}
`;
  const res = await anthropic.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 10,
    messages: [{ role: "user", content: judgePrompt }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "0";
  const score = parseFloat(text.trim()) || 0;
  return {
    score: Math.max(0, Math.min(10, score)),
    usage: res.usage as AnthropicUsage,
    costUsd: pricePerCall(JUDGE_MODEL, res.usage as AnthropicUsage),
  };
}

async function getLastRun(): Promise<EvalRun | null> {
  if (!existsSync(RUNS_DIR)) return null;
  const files = (await readdir(RUNS_DIR)).filter(f => f.endsWith(".json")).sort().reverse();
  if (files.length === 0) return null;
  return JSON.parse(await readFile(path.join(RUNS_DIR, files[0]), "utf-8"));
}

async function main() {
  await mkdir(RUNS_DIR, { recursive: true });
  await mkdir(RESULTS_DIR, { recursive: true });

  const promptPath = path.join(PROMPTS_DIR, `post-class-summary-${ACTIVE_PROMPT_VERSION}.md`);
  const promptTemplate = await readFile(promptPath, "utf-8");
  const golds = await loadGolds();
  if (golds.length === 0) { console.error("No gold files found in evals/gold/"); process.exit(1); }

  console.log(`Running ${golds.length} golds against prompt ${ACTIVE_PROMPT_VERSION} on ${MODEL}, judge=${JUDGE_MODEL}\n`);

  const t0 = Date.now();
  const scores: EvalScore[] = [];
  let totalCost = 0;

  for (const gold of golds) {
    const tCall = Date.now();
    const errors: string[] = [];
    let schemaValid = false;
    let rouge = 0;
    let judge = 0;
    let costForThis = 0;

    try {
      const gen = await generateSummary(gold, promptTemplate);
      costForThis += gen.costUsd;
      if (!gen.output) {
        errors.push("Generated output was not valid JSON");
      } else {
        const v = summaryOutputSchema.safeParse(gen.output);
        schemaValid = v.success;
        if (!v.success) errors.push(`Schema validation failed: ${v.error.issues.slice(0, 3).map(i => i.path.join(".") + ": " + i.message).join("; ")}`);
        rouge = rougeL(gen.output?.summary?.headline || "", gold.expected.summary.headline);

        const transcriptText = gold.input.diarizedTranscript
          .map(t => `[${t.timestamp}] ${t.speaker}: ${t.text}`).join("\n");
        const j = await judgeFidelity(transcriptText, gen.output, gold.expected);
        judge = j.score;
        costForThis += j.costUsd;

        await writeFile(
          path.join(RESULTS_DIR, `${gold.slug}-${ACTIVE_PROMPT_VERSION}.json`),
          JSON.stringify({ generated: gen.output, expected: gold.expected }, null, 2)
        );
      }
    } catch (err: any) {
      errors.push(`Generation threw: ${err.message}`);
    }

    totalCost += costForThis;
    const score: EvalScore = {
      goldSlug: gold.slug,
      schemaValid,
      rougeL: rouge,
      llmJudge: judge,
      errors,
      durationMs: Date.now() - tCall,
      costUsd: costForThis,
    };
    scores.push(score);

    const status = schemaValid ? "✓" : "✗";
    console.log(`${status} ${gold.slug.padEnd(45)} schema=${schemaValid ? "OK" : "FAIL"}  rouge=${rouge.toFixed(2)}  judge=${judge.toFixed(1)}  $${costForThis.toFixed(4)}  ${score.durationMs}ms`);
    if (errors.length > 0) errors.forEach(e => console.log(`  └─ ${e}`));
  }

  const avgRouge = scores.reduce((a, s) => a + s.rougeL, 0) / scores.length;
  const avgJudge = scores.reduce((a, s) => a + s.llmJudge, 0) / scores.length;
  const passRate = scores.filter(s => s.schemaValid).length / scores.length;

  const run: EvalRun = {
    timestamp: new Date().toISOString(),
    promptVersion: ACTIVE_PROMPT_VERSION,
    model: MODEL,
    scores,
    summary: {
      avgRougeL: avgRouge,
      avgLlmJudge: avgJudge,
      schemaPassRate: passRate,
      totalCostUsd: totalCost,
      durationMs: Date.now() - t0,
    },
  };

  const runFile = path.join(RUNS_DIR, `${run.timestamp.replace(/[:.]/g, "-")}.json`);
  await writeFile(runFile, JSON.stringify(run, null, 2));

  console.log(`\nSummary:`);
  console.log(`  Avg ROUGE-L:      ${avgRouge.toFixed(3)}`);
  console.log(`  Avg LLM judge:    ${avgJudge.toFixed(2)}/10`);
  console.log(`  Schema pass:      ${(passRate * 100).toFixed(0)}% (${scores.filter(s => s.schemaValid).length}/${scores.length})`);
  console.log(`  Total cost:       $${totalCost.toFixed(4)}`);
  console.log(`  Duration:         ${(run.summary.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Run saved:        ${path.relative(process.cwd(), runFile)}`);

  const last = await getLastRun().catch(() => null);
  if (last && last.timestamp !== run.timestamp) {
    const dJudge = avgJudge - last.summary.avgLlmJudge;
    const dRouge = avgRouge - last.summary.avgRougeL;
    console.log(`\nVs previous run (${last.promptVersion} @ ${last.timestamp.substring(0, 19)}):`);
    console.log(`  Δ judge: ${dJudge >= 0 ? "+" : ""}${dJudge.toFixed(2)}`);
    console.log(`  Δ rouge: ${dRouge >= 0 ? "+" : ""}${dRouge.toFixed(3)}`);
    if (dJudge < -1.0) {
      console.error(`\n❌ Regression: judge score dropped by more than 1 point. Failing.`);
      process.exit(1);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
