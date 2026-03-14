import { useState } from "react";
import { motion } from "framer-motion";
import { User, Volume2, VolumeX, BookA, Check } from "lucide-react";
import { GrammarHighlight } from "./grammar-highlight";
import { LingoMascot } from "./mascot";

interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

interface VocabItem {
  word: string;
  translation: string;
}

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  corrections?: GrammarCorrection[] | null;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  isLatest?: boolean;
  onSaveCorrection?: (correction: GrammarCorrection) => void;
  onSaveVocab?: (vocab: VocabItem) => void;
}

function extractVocabMarkers(text: string): VocabItem[] {
  const items: VocabItem[] = [];
  const regex = /\[vocab:\s*"([^"]+)"\s*=\s*"([^"]+)"\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    items.push({ word: match[1], translation: match[2] });
  }
  return items;
}

function cleanVocabMarkers(text: string): string {
  return text
    .replace(/\s*\[vocab:\s*"[^"]+"\s*=\s*"[^"]+"\]\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function ChatBubble({ role, content, corrections, onSpeak, isSpeaking, isLatest, onSaveCorrection, onSaveVocab }: ChatBubbleProps) {
  const isUser = role === "user";
  const vocabItems = !isUser ? extractVocabMarkers(content) : [];
  const [savedVocab, setSavedVocab] = useState<Set<string>>(new Set());

  const handleSaveVocab = (item: VocabItem) => {
    if (onSaveVocab) {
      onSaveVocab(item);
      setSavedVocab(prev => new Set(prev).add(item.word));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-offset-1 ${
          isUser
            ? "bg-gradient-to-br from-blue-600 to-blue-700 ring-blue-200"
            : "bg-gradient-to-br from-amber-50 to-orange-50 ring-amber-200"
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <LingoMascot size="sm" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm shadow-lg shadow-blue-500/20"
            : "bg-gradient-to-br from-gray-50 to-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-md shadow-slate-200/50"
        }`}
      >
        {!isUser && corrections && corrections.length > 0 ? (
          <GrammarHighlight content={content} corrections={corrections} onSaveCorrection={onSaveCorrection} onSaveVocab={onSaveVocab} />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {isUser ? content : cleanVocabMarkers(content)}
          </p>
        )}

        {/* Vocabulary section for AI messages */}
        {!isUser && vocabItems.length > 0 && onSaveVocab && !corrections?.length && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1">
              <BookA className="w-3 h-3" />
              Vocabulario
            </p>
            {vocabItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs group">
                <span className="font-medium text-gray-700 bg-amber-50 px-1.5 py-0.5 rounded">{item.word}</span>
                <span className="text-gray-400">=</span>
                <span className="text-gray-500">{item.translation}</span>
                <button
                  onClick={() => handleSaveVocab(item)}
                  disabled={savedVocab.has(item.word)}
                  className={`p-1 rounded transition-colors ${
                    savedVocab.has(item.word)
                      ? "text-green-500"
                      : "text-gray-300 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100"
                  }`}
                  title={savedVocab.has(item.word) ? "Guardado" : "Guardar palabra"}
                >
                  {savedVocab.has(item.word) ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <BookA className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Speak button for AI messages */}
        {!isUser && onSpeak && (
          <button
            onClick={() => onSpeak(content)}
            aria-label={isSpeaking ? "Stop speaking" : "Listen to message"}
            className={`mt-2 flex items-center gap-1.5 text-xs transition-colors group ${
              isSpeaking ? "text-blue-600" : "text-gray-400 hover:text-blue-600"
            }`}
          >
            {isSpeaking ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <VolumeX className="w-3.5 h-3.5" />
              </motion.div>
            ) : (
              <Volume2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            )}
            <span>{isSpeaking ? "Stop" : "Listen"}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
