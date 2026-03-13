import { config } from "../config";

const MAX_TEXT_LENGTH = 1000;

/**
 * Clean text by removing correction markers and formatting artifacts
 * so the spoken output sounds natural.
 */
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\[correction:\s*"[^"]*"\s*→\s*"[^"]*"\]/g, "")
    .replace(/\[pronunciation:\s*[^\]]*\]/g, "")
    .replace(/ERROR:\s*"[^"]*"\s*→\s*CORRECT:\s*"[^"]*"\s*—\s*RULE:\s*.+?(?:\n|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function generateSpeech(
  text: string,
  language: "spanish" | "english"
): Promise<Buffer> {
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const cleanText = cleanTextForSpeech(text).slice(0, MAX_TEXT_LENGTH);

  if (!cleanText) {
    throw new Error("No speakable text after cleaning");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "nova",
      input: cleanText,
      response_format: "mp3",
      speed: language === "spanish" ? 0.9 : 1.0,
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "Unknown error");
    throw new Error(`OpenAI TTS API error (${response.status}): ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
