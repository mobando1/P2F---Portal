import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language: "spanish" | "english";
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, language, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<any>(null);

  const langCode = language === "spanish" ? "es-ES" : "en-US";

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langCode;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterim("");
      } else {
        setInterim(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setInterim("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [langCode, onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterim("");
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        aria-label={isListening ? "Stop recording" : "Start voice recording"}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={`p-2.5 rounded-xl transition-all ${
          isListening
            ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-300/40"
            : "bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </motion.button>

      {/* Listening pulse animation */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-xl bg-red-400 -z-10"
          />
        )}
      </AnimatePresence>

      {/* Interim text */}
      <AnimatePresence>
        {interim && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap max-w-[200px] truncate shadow-lg"
          >
            {interim}...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Text-to-speech utility
export function speakText(text: string, language: "spanish" | "english") {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "spanish" ? "es-ES" : "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}
