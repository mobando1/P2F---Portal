import { useState, useRef, useCallback } from "react";
import { speakText } from "../components/ai/voice-input";

const audioCache = new Map<string, string>();

export function useTTS(language: "spanish" | "english") {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      stop();

      const cacheKey = `${language}:${text}`;
      const cachedUrl = audioCache.get(cacheKey);

      if (cachedUrl) {
        setIsSpeaking(true);
        const audio = new Audio(cachedUrl);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play().catch(() => setIsSpeaking(false));
        return;
      }

      try {
        setIsSpeaking(true);
        const response = await fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: text.slice(0, 1000), language }),
        });

        if (!response.ok) {
          speakText(text, language);
          setIsSpeaking(false);
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        audioCache.set(cacheKey, url);

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
      } catch {
        speakText(text, language);
        setIsSpeaking(false);
      }
    },
    [language, stop]
  );

  return { speak, stop, isSpeaking };
}
