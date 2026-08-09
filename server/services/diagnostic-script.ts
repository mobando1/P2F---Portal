/**
 * The Diagnostic Class protocol — the fixed 50-minute structure every free
 * first class follows.
 *
 * Why this is a module and not a PDF: three consumers need the exact same
 * script or the whole pipeline degrades.
 *
 *   1. The coach briefing email (sendTutorNewBooking) — so the coach knows
 *      what to do before they walk in.
 *   2. The tutor portal prep card — same, on screen.
 *   3. The study-plan generator — it locates each section of the transcript by
 *      searching for the coach's MARKER phrase. If a coach paraphrases, the
 *      segment is lost and the plan falls back to reading the whole transcript.
 *
 * Every block exists to produce a specific field of the study plan. If a block
 * stops feeding a field, delete the block.
 *
 * Language convention (matches the rest of the Portal): the key is the
 * STUDENT's language.
 *   - `es` → Spanish-speaking student learning ENGLISH  (the /en offer)
 *   - `en` → English-speaking student learning SPANISH  (the /es offer)
 */

export const SCRIPT_VERSION = "v1-2026-08";

/** Nominal length of a diagnostic class. Must match TRIAL_DURATION_MIN. */
export const DIAGNOSTIC_DURATION_MIN = 50;

export type ScriptLang = "es" | "en";

/**
 * Which language the block is conducted in.
 * `native` = the student's own language, `target` = the language being learned.
 */
export type BlockLanguage = "native" | "target";

export interface DiagnosticBlock {
  /** Stable code. Referenced by the generator prompt — do not rename. */
  id: string;
  minuteStart: number;
  minuteEnd: number;
  title: string;
  /**
   * Said VERBATIM by the coach on entering the block. This is what makes an
   * unstructured transcript segmentable without any tooling, so it is not a
   * suggestion — the wording is the interface.
   */
  marker: string;
  /** Which study-plan fields this block feeds. Shown to the coach as the "why". */
  produces: string[];
  /** Short instructions. Kept to one or two sentences — coaches read this on a phone. */
  coachNotes: string;
  language: BlockLanguage;
}

const BLOCKS_ES: DiagnosticBlock[] = [
  {
    id: "frame",
    minuteStart: 0,
    minuteEnd: 3,
    title: "Encuadre y consentimiento",
    marker: "Antes de empezar te cuento cómo va a funcionar esta clase.",
    produces: ["Consentimiento de grabación", "Expectativa del plan"],
    coachNotes:
      "Explica que vas a escuchar más de lo que vas a hablar, que al final le mandas un plan escrito, y que el plan es suyo se inscriba o no. Pide permiso para grabar en una sola frase, con naturalidad.",
    language: "native",
  },
  {
    id: "why",
    minuteStart: 3,
    minuteEnd: 10,
    title: "El porqué",
    marker: "Primero cuéntame: ¿por qué el inglés, y por qué ahora?",
    produces: ["goalInTheirWords", "La urgencia / el disparador"],
    coachNotes:
      'El "por qué ahora" es lo que separa a un curioso de un comprador. Ya leíste su respuesta del formulario — pídele que la desarrolle, no que la repita.',
    language: "native",
  },
  {
    id: "cost",
    minuteStart: 10,
    minuteEnd: 13,
    title: "El costo de no hacerlo",
    marker: "Y si dentro de un año sigues exactamente igual que hoy, ¿qué te cuesta eso?",
    produces: ["La línea de costo de no actuar que abre el plan"],
    coachNotes:
      "Pregúntalo con suavidad y después CÁLLATE. El silencio es la herramienta. Esta es la pregunta que le faltó al estudiante que se entusiasmó y desapareció.",
    language: "native",
  },
  {
    id: "free_sample",
    minuteStart: 13,
    minuteEnd: 20,
    title: "Muestra libre de habla",
    marker: "Ahora cambiamos a inglés. Tell me about your week.",
    produces: ["Línea base de fluidez", "Rango léxico", "Patrón de errores"],
    coachNotes:
      "Tres minutos corridos sin interrumpir. NO CORRIJAS AQUÍ — necesitas habla continua para medir fluidez de verdad. Anota, no interrumpas.",
    language: "target",
  },
  {
    id: "target_task",
    minuteStart: 20,
    minuteEnd: 30,
    title: "La tarea real (role-play)",
    marker: "Let's do the real thing. I'm going to be",
    produces: ["Línea base de la tarea objetivo", "Las citas más contundentes del plan"],
    coachNotes:
      'El bloque más importante. Dramatiza EXACTAMENTE el escenario que escribió en el formulario. Si dijo "liderar la reunión de los lunes", tú eres el jefe y arrancas la reunión. Aquí es donde la clase entrega valor antes de que pase un dólar.',
    language: "target",
  },
  {
    id: "listening",
    minuteStart: 30,
    minuteEnd: 35,
    title: "Comprensión auditiva",
    marker: "Ahora te voy a poner algo a velocidad normal y me cuentas qué entendiste.",
    produces: ["Línea base de comprensión"],
    coachNotes:
      "Velocidad nativa real, no reducida. Un audio corto o tú hablando a tu ritmo normal. Pídele que resuma, no que traduzca.",
    language: "target",
  },
  {
    id: "self_diagnosis",
    minuteStart: 35,
    minuteEnd: 40,
    title: "Autodiagnóstico",
    marker: "¿Dónde sentiste que se te trabó?",
    produces: ["blocker", "Qué método ya falló"],
    coachNotes:
      'Sigue con: "¿Qué has intentado antes y por qué crees que no funcionó?" — eso evita que le recetes el método que ya le falló, y el plan puede decir explícitamente por qué esto es distinto.',
    language: "native",
  },
  {
    id: "reality_check",
    minuteStart: 40,
    minuteEnd: 45,
    title: "Realidad operativa",
    marker:
      "Siendo realista: ¿cuántos días a la semana puedes darle 50 minutos? ¿Y para cuándo lo necesitas?",
    produces: ["recommendation.sessionsPerWeek", "recommendation.durationWeeks"],
    coachNotes:
      "SIN ESTO EL PLAN NO PUEDE RECOMENDAR NADA. Frecuencia + fecha límite es lo que convierte tres precios en una sola recomendación. No lo saltes por falta de tiempo.",
    language: "native",
  },
  {
    id: "closing",
    minuteStart: 45,
    minuteEnd: 50,
    title: "Cierre y promesa del plan",
    marker: "Te resumo lo que vi.",
    produces: ["La expectativa de entrega", "El momento de venta"],
    coachNotes:
      "Usa el guion de cierre casi textual. No des precio. El plan lleva la recomendación por escrito, y por escrito es más persuasivo que tú.",
    language: "native",
  },
];

const BLOCKS_EN: DiagnosticBlock[] = [
  {
    id: "frame",
    minuteStart: 0,
    minuteEnd: 3,
    title: "Framing and consent",
    marker: "Before we start, let me tell you how this class is going to work.",
    produces: ["Recording consent", "Plan expectation"],
    coachNotes:
      "Explain that you'll listen more than you talk, that you're sending a written plan afterwards, and that the plan is theirs whether or not they enroll. Ask for recording permission in one casual sentence.",
    language: "native",
  },
  {
    id: "why",
    minuteStart: 3,
    minuteEnd: 10,
    title: "The why",
    marker: "First tell me: why Spanish, and why now?",
    produces: ["goalInTheirWords", "Urgency / the trigger"],
    coachNotes:
      'The "why now" is what separates a browser from a buyer. You already read their form answer — ask them to expand on it, not repeat it.',
    language: "native",
  },
  {
    id: "cost",
    minuteStart: 10,
    minuteEnd: 13,
    title: "The cost of not doing it",
    marker: "And if a year from now you're exactly where you are today, what does that cost you?",
    produces: ["The cost-of-inaction line that opens the plan"],
    coachNotes:
      "Ask it gently and then STAY QUIET. The silence is the tool. This is the question that was missing with the student who got excited and disappeared.",
    language: "native",
  },
  {
    id: "free_sample",
    minuteStart: 13,
    minuteEnd: 20,
    title: "Free speech sample",
    marker: "Now let's switch to Spanish. Cuéntame de tu semana.",
    produces: ["Fluency baseline", "Lexical range", "Error pattern"],
    coachNotes:
      "Three uninterrupted minutes. DO NOT CORRECT HERE — you need continuous speech to measure real fluency. Take notes, don't interrupt.",
    language: "target",
  },
  {
    id: "target_task",
    minuteStart: 20,
    minuteEnd: 30,
    title: "The real task (role-play)",
    marker: "Hagámoslo de verdad. Yo voy a ser",
    produces: ["Target-task baseline", "The strongest quotes in the plan"],
    coachNotes:
      'The most important block. Role-play EXACTLY the scenario they wrote in the form. If they said "order dinner for the whole table in Bogotá", you are the waiter. This is where the class delivers value before a dollar changes hands.',
    language: "target",
  },
  {
    id: "listening",
    minuteStart: 30,
    minuteEnd: 35,
    title: "Listening comprehension",
    marker: "Ahora te voy a poner algo a velocidad normal y me cuentas qué entendiste.",
    produces: ["Comprehension baseline"],
    coachNotes:
      "Real native speed, not slowed down. A short clip or you speaking at your normal pace. Ask them to summarize, not translate.",
    language: "target",
  },
  {
    id: "self_diagnosis",
    minuteStart: 35,
    minuteEnd: 40,
    title: "Self-diagnosis",
    marker: "Where did you feel yourself stall?",
    produces: ["blocker", "What method already failed"],
    coachNotes:
      'Follow with: "What have you tried before, and why do you think it didn\'t work?" — that stops you prescribing the method that already failed them, and lets the plan say explicitly why this is different.',
    language: "native",
  },
  {
    id: "reality_check",
    minuteStart: 40,
    minuteEnd: 45,
    title: "Reality check",
    marker: "Realistically: how many days a week can you give this 50 minutes? And by when do you need it?",
    produces: ["recommendation.sessionsPerWeek", "recommendation.durationWeeks"],
    coachNotes:
      "WITHOUT THIS THE PLAN CANNOT RECOMMEND ANYTHING. Frequency plus deadline is what turns three prices into a single recommendation. Do not skip it for time.",
    language: "native",
  },
  {
    id: "closing",
    minuteStart: 45,
    minuteEnd: 50,
    title: "Closing and the plan promise",
    marker: "Let me tell you what I saw.",
    produces: ["Delivery expectation", "The sales moment"],
    coachNotes:
      "Use the closing script almost verbatim. Do not quote a price. The plan carries the recommendation in writing, and in writing it is more persuasive than you are.",
    language: "native",
  },
];

export const DIAGNOSTIC_SCRIPT: Record<ScriptLang, DiagnosticBlock[]> = {
  es: BLOCKS_ES,
  en: BLOCKS_EN,
};

/**
 * The marker phrases, keyed by block id — what the transcript segmenter looks
 * for. Includes BOTH languages for every block because coaches code-switch and
 * a Spanish-speaking coach running an English-offer class may well say the
 * English marker.
 */
export const MARKER_PHRASES: Record<string, string[]> = BLOCKS_ES.reduce(
  (acc, block) => {
    const twin = BLOCKS_EN.find((b) => b.id === block.id);
    acc[block.id] = twin ? [block.marker, twin.marker] : [block.marker];
    return acc;
  },
  {} as Record<string, string[]>,
);

/** Non-negotiables. These are the rules that keep the diagnostic from turning back into a sales call. */
export const COACH_RULES: Record<ScriptLang, string[]> = {
  es: [
    'Nunca digas "clase de prueba". Siempre "clase de diagnóstico".',
    "Cero venta en los minutos 1 a 45.",
    "Corrige máximo tres errores en vivo; el resto se anota. Ser corregido constantemente en la primera clase es por lo que la gente no vuelve.",
    "No des precio en la sesión. El plan lleva la recomendación por escrito.",
    "Envía el plan aunque el estudiante se haya enfriado — sobre todo si se enfrió. Ese es el caso que el plan existe para recuperar.",
  ],
  en: [
    'Never say "trial class". Always "diagnostic class".',
    "Zero selling in minutes 1 through 45.",
    "Correct at most three errors live; write down the rest. Being corrected constantly in a first class is why people don't come back.",
    "Don't quote a price in the session. The plan carries the recommendation in writing.",
    "Send the plan even if the student went cold — especially if they went cold. That's the case the plan exists to recover.",
  ],
};

/**
 * The closing script for block 9. Placeholders in [brackets] are filled by the
 * coach live, not by code.
 */
export const CLOSING_SCRIPT: Record<ScriptLang, string> = {
  es: `Te resumo lo que vi. Hoy estás en [nivel, una frase]. Lo que más te está frenando son [dos o tres cosas concretas]. Con tu meta de [su meta, en sus palabras] y los [X] días que me dices que tienes, esto se hace en unos [Y] meses trabajando [N] veces por semana.

Todo eso te lo mando escrito a tu portal antes del [día], con la ruta semana por semana. Ese plan es tuyo, te inscribas o no — quiero que por lo menos sepas cuál es el camino, aunque decidas caminarlo solo.

Y algo que quiero que tengas claro: aquí el plan es tuyo, no de un grupo. No vas al ritmo del que va más rápido ni esperas al que se queda atrás. Vas al tuyo, conmigo al frente. Cuando leas el plan, si quieres que lo recorramos juntos, el paso siguiente está ahí mismo.`,
  en: `Let me tell you what I saw. Today you're at [level, one sentence]. What's holding you back most is [two or three concrete things]. With your goal of [their goal, their words] and the [X] days a week you told me you have, this is roughly a [Y]-month job at [N] times a week.

All of that goes to your portal in writing before [day], with the week-by-week route. That plan is yours whether you enroll or not — I want you to at least know the road, even if you decide to walk it on your own.

And one thing I want to be clear about: here, the plan is yours, not a group's. You're not keeping up with whoever's fastest and you're not waiting on whoever's behind. You go at your pace, with me across from you. When you read the plan, if you want us to walk it together, the next step is right there in it.`,
};

/* ------------------------------------------------------------------ *
 * The baseline rubric
 *
 * The transcript gives the qualitative evidence; the rubric gives the NUMBERS
 * progress is measured against. Same rubric is re-scored at class 4, 8 and 12,
 * and the student watches the same bars move on their plan page. That is the
 * entire v1 progress system — no new subsystem.
 * ------------------------------------------------------------------ */

export const RUBRIC_ASSESSMENT_POINTS = [1, 4, 8, 12] as const;

export type RubricSkill =
  | "fluency"
  | "listening"
  | "lexicalRange"
  | "grammaticalAccuracy"
  | "confidence";

export const RUBRIC_SKILLS: {
  id: RubricSkill;
  label: Record<ScriptLang, string>;
  /** Which block of the class the coach scores this from. */
  evidenceFrom: string;
}[] = [
  {
    id: "fluency",
    label: { es: "Fluidez", en: "Fluency" },
    evidenceFrom: "free_sample",
  },
  {
    id: "listening",
    label: { es: "Comprensión auditiva", en: "Listening comprehension" },
    evidenceFrom: "listening",
  },
  {
    id: "lexicalRange",
    label: { es: "Rango léxico", en: "Lexical range" },
    evidenceFrom: "free_sample",
  },
  {
    id: "grammaticalAccuracy",
    label: { es: "Precisión gramatical", en: "Grammatical accuracy" },
    evidenceFrom: "target_task",
  },
  {
    id: "confidence",
    label: { es: "Confianza al hablar", en: "Speaking confidence" },
    evidenceFrom: "target_task",
  },
];

export type TargetTaskResult = "failed" | "heavy_help" | "partial" | "completed";

export const TARGET_TASK_RESULTS: { id: TargetTaskResult; label: Record<ScriptLang, string> }[] = [
  { id: "failed", label: { es: "No la completó", en: "Couldn't complete it" } },
  { id: "heavy_help", label: { es: "Con mucha ayuda", en: "With heavy help" } },
  { id: "partial", label: { es: "Parcialmente", en: "Partially" } },
  { id: "completed", label: { es: "Sí la completó", en: "Completed it" } },
];

/* ------------------------------------------------------------------ *
 * Renderers — the email, the portal and the coach one-pager all render from
 * here so they cannot drift.
 * ------------------------------------------------------------------ */

/** Plain text, for the coach one-pager and for embedding in the generator prompt. */
export function renderScriptPlainText(lang: ScriptLang): string {
  const blocks = DIAGNOSTIC_SCRIPT[lang];
  const heading =
    lang === "es"
      ? `PROTOCOLO — Clase de Diagnóstico (${DIAGNOSTIC_DURATION_MIN} min) · ${SCRIPT_VERSION}`
      : `PROTOCOL — Diagnostic Class (${DIAGNOSTIC_DURATION_MIN} min) · ${SCRIPT_VERSION}`;
  const rulesHeading = lang === "es" ? "REGLAS" : "RULES";
  const closingHeading = lang === "es" ? "CIERRE (casi textual)" : "CLOSING (almost verbatim)";
  const saysLabel = lang === "es" ? "Dices" : "You say";

  const body = blocks
    .map(
      (b, i) =>
        `${i + 1}. [${b.minuteStart}-${b.minuteEnd} min] ${b.title}\n` +
        `   ${saysLabel}: "${b.marker}"\n` +
        `   ${b.coachNotes}`,
    )
    .join("\n\n");

  return [
    heading,
    "",
    body,
    "",
    rulesHeading,
    COACH_RULES[lang].map((r, i) => `${i + 1}. ${r}`).join("\n"),
    "",
    closingHeading,
    CLOSING_SCRIPT[lang],
  ].join("\n");
}

/**
 * HTML for the coach briefing email. Intentionally table-free and inline-styled
 * to match the templates already in email.ts.
 */
export function renderScriptHtml(lang: ScriptLang): string {
  const blocks = DIAGNOSTIC_SCRIPT[lang];
  const heading =
    lang === "es"
      ? `Protocolo de la clase (${DIAGNOSTIC_DURATION_MIN} min)`
      : `Class protocol (${DIAGNOSTIC_DURATION_MIN} min)`;
  const saysLabel = lang === "es" ? "Dices" : "You say";

  const items = blocks
    .map(
      (b) => `
      <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #F1F5F9;">
        <div style="font-size:12px;color:#94A3B8;letter-spacing:.04em;text-transform:uppercase;">
          ${b.minuteStart}–${b.minuteEnd} min
        </div>
        <div style="font-weight:600;color:#0A4A6E;margin:2px 0 4px;">${escapeHtml(b.title)}</div>
        <div style="color:#0F172A;margin-bottom:4px;">
          ${saysLabel}: <em>"${escapeHtml(b.marker)}"</em>
        </div>
        <div style="color:#64748B;font-size:14px;">${escapeHtml(b.coachNotes)}</div>
      </div>`,
    )
    .join("");

  const rules = COACH_RULES[lang].map((r) => `<li style="margin-bottom:4px;">${escapeHtml(r)}</li>`).join("");

  return `
    <div style="background:#FFF7ED;border-left:4px solid #F59E1C;padding:16px 18px;border-radius:6px;margin:20px 0;">
      <h3 style="margin:0 0 12px;color:#0A4A6E;font-size:17px;">${heading}</h3>
      ${items}
      <ul style="margin:12px 0 0;padding-left:18px;color:#64748B;font-size:14px;">${rules}</ul>
    </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
