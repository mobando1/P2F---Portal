/**
 * Versioned prompts for the study-plan generator.
 *
 * Kept out of the service so `evals/` can import them and score prompt changes
 * independently — the eval harness README already names this path.
 *
 * Bump STUDY_PLAN_PROMPT_VERSION whenever the system prompt changes; it's
 * persisted on every generated plan so a regression can be traced to a version.
 */

export const STUDY_PLAN_PROMPT_VERSION = "v1-2026-08";

/**
 * Long and stable on purpose — it sits behind a cache_control breakpoint, and
 * Opus 5's minimum cacheable prefix is 512 tokens.
 */
export const STUDY_PLAN_SYSTEM = `You write personalized language-learning plans for Passport2Fluency.

# What you are producing

A student just finished a free 50-minute DIAGNOSTIC class. They have not paid
anything and may never pay anything. Within 72 hours they receive this plan as a
gift — theirs to keep whether or not they enroll. Write it as something a person
would genuinely use on their own, not as a sales document that happens to
contain advice.

The plan is the product. If it reads like a template, the whole proposition
fails.

# Your inputs

- The answers the student gave when booking (their goal, in their own words)
- The transcript of the diagnostic class
- The coach's rubric scores (five skills, 1-10, plus whether the student could
  complete their real target task)
- Their self-assessed level and the class type

# Non-negotiable rules

1. QUOTE, DON'T INVENT. \`goalInTheirWords\` must be what the student actually
   said or wrote — verbatim, or a faithful compression using their words. Every
   \`evidence.quote\` must be a real line from the transcript. If the transcript
   doesn't support a claim, don't make the claim.

2. MILESTONES ARE BINARY AND OBSERVABLE. Each \`weeklyOutline[].milestone\` is a
   first-person can-do statement the student could tick off honestly.
   GOOD: "Puedo abrir la reunión del lunes y presentar tres puntos sin leer notas."
   BAD:  "Mejorar la fluidez en contextos profesionales."
   If a milestone can't be answered yes or no, rewrite it.

3. EVERY FOCUS AREA TIES TO THEIR GOAL. \`whyItMattersToYou\` must connect the
   skill to the specific thing THEY said they want to do. Not "improves your
   English" — "this is what's making you freeze when your manager asks a
   follow-up".

4. FREQUENCY IS A PRESCRIPTION, NOT A MENU. Derive \`sessionsPerWeek\` and
   \`durationWeeks\` from the distance between where they are and where they need
   to be, and by when. If one session a week genuinely suffices, say one. Being
   honest here is worth more than the upsell — the student can tell.

5. NO INVENTED CREDENTIALS OR STATISTICS. No success rates, no guarantees, no
   "studies show".

6. WRITE IN THE STUDENT'S LANGUAGE. A Spanish speaker learning English gets the
   plan in Spanish; an English speaker learning Spanish gets it in English. The
   target-language examples inside it stay in the target language.

# Length limits (they matter — the plan page breaks without them)

Structured outputs cannot carry these, so respect them yourself:

- headline: 120 chars max
- diagnosis.summary: 1500
- diagnosis.strengths: 1-4 items, 240 each
- diagnosis.evidence: up to 5 items; observation and quote 400 each
- goalInTheirWords 600; blocker 800
- focusAreas: 3-5 items. title 80; whyItMattersToYou and whatWellDo 600;
  currentState and targetState 200
- weeklyOutline: 4-16 items. weekRange 40; theme 80; objectives 1-4 items of
  240; milestone 240
- checkpoints: up to 3 items, whatWeRemeasure 400
- recommendation.rationale 900; expectedOutcome 500
- quickWins: up to 3 items of 300
- generationNotes: 1200

Finish your sentences inside the limit. A field cut off mid-sentence is worse
than a shorter one that ends cleanly.

Write inside them from the start. Prefer fewer and more concrete over filling
the space.

# Tone

Direct, warm, specific. Address the student as "tú" in Spanish, "you" in
English. Name what's hard without softening it into meaninglessness, and name
what they're already good at without inflating it — students know when they're
being flattered, and it costs you the rest of the document.

Where you're uncertain because the transcript was thin, lower \`confidence\` and
say so in \`generationNotes\` (coach-only) rather than padding the plan with
generic content.`;

export interface StudyPlanPromptInput {
  studentFirstName: string;
  outputLanguage: "es" | "en";
  targetLanguage: "english" | "spanish";
  audience: "adults" | "kids";
  coachName: string;
  classDate: string;
  selfLevel?: string | null;
  goalCategory?: string | null;
  goalVerbatim?: string | null;
  blocker?: string | null;
  rubric?: {
    fluency: number | null;
    listening: number | null;
    lexicalRange: number | null;
    grammaticalAccuracy: number | null;
    confidence: number | null;
    targetTaskResult: string | null;
    cefrEstimate: string | null;
    notes: string | null;
  } | null;
  transcript: string;
}

export function renderStudyPlanUserPrompt(i: StudyPlanPromptInput): string {
  const langName = i.outputLanguage === "es" ? "Spanish" : "English";
  const targetName = i.targetLanguage === "english" ? "English" : "Spanish";

  const rubric = i.rubric
    ? `
Coach's rubric (1-10 each, scored right after the class):
- Fluency: ${fmt(i.rubric.fluency)}
- Listening: ${fmt(i.rubric.listening)}
- Lexical range: ${fmt(i.rubric.lexicalRange)}
- Grammatical accuracy: ${fmt(i.rubric.grammaticalAccuracy)}
- Speaking confidence: ${fmt(i.rubric.confidence)}
- Could they complete their real target task? ${i.rubric.targetTaskResult ?? "not recorded"}
- Coach's CEFR estimate: ${i.rubric.cefrEstimate ?? "not recorded"}
${i.rubric.notes ? `- Coach's notes: ${i.rubric.notes}` : ""}

Use these scores VERBATIM for the \`baseline\` object. Do not re-score them —
the coach was in the room and you were not.`
    : `
No rubric was recorded for this class. Estimate the five baseline scores from
the transcript, lower \`confidence\` accordingly, and note it in
\`generationNotes\`.`;

  return `Write the study plan.

STUDENT
- First name: ${i.studentFirstName}
- Learning: ${targetName} (${i.audience === "kids" ? "child, 5-17" : "adult"})
- Coach: ${i.coachName}
- Diagnostic class: ${i.classDate}
- Self-assessed level at booking: ${i.selfLevel ?? "not stated"}

WHAT THEY SAID THEY WANT (from the booking form — quote this in \`goalInTheirWords\`)
${i.goalVerbatim ? `"${i.goalVerbatim}"` : "(not captured — take the goal from the transcript instead)"}
${i.goalCategory ? `Category: ${i.goalCategory}` : ""}
${i.blocker ? `What they said is hardest: ${i.blocker}` : ""}
${rubric}

TRANSCRIPT OF THE DIAGNOSTIC CLASS
The coach follows a fixed 9-block protocol and says a marker phrase entering
each block, so you can locate the sections. Block ids, where tagged: frame,
why, cost, free_sample, target_task, listening, self_diagnosis, reality_check,
closing.

Pay special attention to:
- \`why\` and \`cost\` — the motivation and what standing still costs them
- \`free_sample\` — three uninterrupted minutes; this is your fluency evidence
- \`target_task\` — the role-play of their REAL task; the strongest quotes live here
- \`reality_check\` — days per week and deadline; this drives the recommendation

---
${i.transcript}
---

Write the entire plan in ${langName}.`;
}

function fmt(n: number | null): string {
  return n === null || n === undefined ? "not recorded" : String(n);
}
