import { z } from "zod";

export const goldInputSchema = z.object({
  studentName: z.string(),
  studentLevel: z.string(),       // CEFR like "A2.1", "B1.2"
  tutorName: z.string(),
  targetLanguage: z.enum(["spanish", "english"]),
  uiLanguage: z.enum(["es", "en"]),
  durationMinutes: z.number(),
  diarizedTranscript: z.array(z.object({
    speaker: z.enum(["tutor", "student"]),
    timestamp: z.string(),         // "MM:SS"
    text: z.string(),
  })),
  recurringErrorsContext: z.array(z.string()).default([]),
});

export const summaryOutputSchema = z.object({
  summary: z.object({
    headline: z.string().max(160),
    durationMinutes: z.number(),
    topics: z.array(z.string()),
    levelFocus: z.string(),
  }),
  keyMoments: z.array(z.object({
    timestamp: z.string(),
    type: z.enum(["concept_taught", "student_breakthrough", "confusion_point", "off_topic"]),
    description: z.string(),
  })),
  vocabularyIntroduced: z.array(z.object({
    word: z.string(),
    translation: z.string(),
    context: z.string(),
    mastered: z.boolean(),
  })),
  errorsDetected: z.array(z.object({
    type: z.string(),
    incorrect: z.string(),
    correct: z.string(),
    explanation: z.string(),
    frequency: z.number(),
    severity: z.enum(["none", "low", "medium", "high"]),
  })),
  skillsAssessment: z.object({
    speakingFluency: z.object({ score: z.number(), level: z.string() }),
    grammarAccuracy: z.object({ score: z.number(), level: z.string() }),
    vocabularyRange: z.object({ score: z.number(), level: z.string() }),
    listeningComprehension: z.object({ score: z.number(), level: z.string() }),
    pronunciation: z.object({ score: z.number(), level: z.string() }),
  }),
  homework: z.array(z.object({
    title: z.string(),
    description: z.string(),
    estimatedTimeMin: z.number(),
    dueInDays: z.number(),
    type: z.enum(["writing", "speaking", "ai_practice", "reading", "listening"]),
  })).max(3),
  nextClassRecommendations: z.array(z.string()).max(3),
  tutorPrivateNotes: z.string(),
  sharedNotes: z.string(),
  engagementMetrics: z.object({
    studentSpeakingTimePct: z.number(),
    tutorSpeakingTimePct: z.number(),
    questionsFromStudent: z.number(),
    silencePeriodsOver5s: z.number(),
    offTopicPeriods: z.number(),
  }),
  confidenceScore: z.number().min(0).max(1),
});

export const goldFileSchema = z.object({
  slug: z.string(),
  description: z.string(),
  input: goldInputSchema,
  expected: summaryOutputSchema,
});

export type GoldInput = z.infer<typeof goldInputSchema>;
export type SummaryOutput = z.infer<typeof summaryOutputSchema>;
export type GoldFile = z.infer<typeof goldFileSchema>;

export interface EvalScore {
  goldSlug: string;
  schemaValid: boolean;
  rougeL: number;          // 0-1
  llmJudge: number;        // 0-10
  errors: string[];
  durationMs: number;
  costUsd: number;
}

export interface EvalRun {
  timestamp: string;
  promptVersion: string;
  model: string;
  scores: EvalScore[];
  summary: {
    avgRougeL: number;
    avgLlmJudge: number;
    schemaPassRate: number;
    totalCostUsd: number;
    durationMs: number;
  };
}
