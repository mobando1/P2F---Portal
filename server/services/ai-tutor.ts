import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!config.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  chat: {
    spanish: `You are a friendly Spanish language practice partner called "P2F Practice Partner".
Your job is to have natural conversations in Spanish to help the student practice.

Rules:
- Respond primarily in Spanish, adjusting complexity to the student's level
- If the student makes grammar mistakes, gently correct them inline using this format: [correction: "wrong" → "correct"]
- Keep responses conversational and encouraging (2-4 sentences typically)
- If the student writes in English, respond in Spanish but include a brief translation
- Suggest interesting topics if the conversation stalls
- Be warm, patient, and supportive — you're a practice buddy, not a strict teacher`,

    english: `You are a friendly English language practice partner called "P2F Practice Partner".
Your job is to have natural conversations in English to help the student practice.

Rules:
- Respond primarily in English, adjusting complexity to the student's level
- If the student makes grammar mistakes, gently correct them inline using this format: [correction: "wrong" → "correct"]
- Keep responses conversational and encouraging (2-4 sentences typically)
- If the student writes in Spanish, respond in English but include a brief translation
- Suggest interesting topics if the conversation stalls
- Be warm, patient, and supportive — you're a practice buddy, not a strict teacher`,
  },
  voice: {
    spanish: `You are a Spanish speaking practice partner for oral conversation.
Keep responses SHORT (1-2 sentences) so the student can practice speaking back.
Use simple, clear language. Correct pronunciation hints when relevant using [pronunciation: word → phonetic].
Suggest topics that encourage the student to speak more.`,

    english: `You are an English speaking practice partner for oral conversation.
Keep responses SHORT (1-2 sentences) so the student can practice speaking back.
Use simple, clear language. Correct pronunciation hints when relevant using [pronunciation: word → phonetic].
Suggest topics that encourage the student to speak more.`,
  },
  grammar: {
    spanish: `You are a Spanish grammar tutor. Focus on:
- Explaining grammar rules clearly with examples
- Providing exercises (fill-in-the-blank, conjugation, sentence correction)
- When the student submits text, analyze ALL grammar errors in detail
- Format corrections as: ERROR: "mistake" → CORRECT: "correction" — RULE: explanation
- Be thorough but encouraging`,

    english: `You are an English grammar tutor. Focus on:
- Explaining grammar rules clearly with examples
- Providing exercises (fill-in-the-blank, conjugation, sentence correction)
- When the student submits text, analyze ALL grammar errors in detail
- Format corrections as: ERROR: "mistake" → CORRECT: "correction" — RULE: explanation
- Be thorough but encouraging`,
  },
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiResponse {
  content: string;
  corrections?: GrammarCorrection[];
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

const FREE_MESSAGE_LIMIT = 10; // messages per day for free users

export function hasAiAccess(user: { aiSubscriptionActive?: boolean | null; aiMessagesUsed?: number | null }): {
  hasAccess: boolean;
  remaining: number;
  isSubscribed: boolean;
} {
  const isSubscribed = user.aiSubscriptionActive === true;
  if (isSubscribed) {
    return { hasAccess: true, remaining: -1, isSubscribed: true }; // -1 = unlimited
  }
  const used = user.aiMessagesUsed || 0;
  const remaining = Math.max(0, FREE_MESSAGE_LIMIT - used);
  return { hasAccess: remaining > 0, remaining, isSubscribed: false };
}

export async function generateChatResponse(
  messages: ChatMessage[],
  language: string,
  mode: string
): Promise<AiResponse> {
  const anthropic = getClient();
  const systemPrompt = SYSTEM_PROMPTS[mode]?.[language] || SYSTEM_PROMPTS.chat.spanish;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  // Extract corrections from the response
  const corrections = extractCorrections(content);

  return { content, corrections };
}

function extractCorrections(text: string): GrammarCorrection[] {
  const corrections: GrammarCorrection[] = [];
  // Match [correction: "wrong" → "correct"] pattern
  const correctionRegex = /\[correction:\s*"([^"]+)"\s*→\s*"([^"]+)"\]/g;
  let match;
  while ((match = correctionRegex.exec(text)) !== null) {
    corrections.push({
      original: match[1],
      corrected: match[2],
      explanation: "",
    });
  }
  // Match ERROR: "mistake" → CORRECT: "correction" — RULE: explanation
  const grammarRegex = /ERROR:\s*"([^"]+)"\s*→\s*CORRECT:\s*"([^"]+)"\s*—\s*RULE:\s*(.+?)(?:\n|$)/g;
  while ((match = grammarRegex.exec(text)) !== null) {
    corrections.push({
      original: match[1],
      corrected: match[2],
      explanation: match[3].trim(),
    });
  }
  return corrections;
}

export async function generateConversationTitle(firstMessage: string, language: string): Promise<string> {
  try {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [{ role: "user", content: firstMessage }],
      system: `Generate a short title (3-5 words, in ${language === 'spanish' ? 'Spanish' : 'English'}) for a conversation that starts with this message. Return ONLY the title, nothing else.`,
    });
    return response.content[0].type === "text" ? response.content[0].text.trim() : "New Conversation";
  } catch {
    return language === "spanish" ? "Nueva Conversación" : "New Conversation";
  }
}
