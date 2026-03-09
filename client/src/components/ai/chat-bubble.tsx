import { motion } from "framer-motion";
import { Bot, User, Volume2 } from "lucide-react";
import { GrammarHighlight } from "./grammar-highlight";

interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  corrections?: GrammarCorrection[] | null;
  onSpeak?: (text: string) => void;
  isLatest?: boolean;
}

export function ChatBubble({ role, content, corrections, onSpeak, isLatest }: ChatBubbleProps) {
  const isUser = role === "user";

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
            : "bg-gradient-to-br from-amber-400 to-orange-500 ring-amber-200"
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
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
          <GrammarHighlight content={content} corrections={corrections} />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        )}

        {/* Speak button for AI messages */}
        {!isUser && onSpeak && (
          <button
            onClick={() => onSpeak(content)}
            aria-label="Listen to message"
            className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors group"
          >
            <Volume2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span>Listen</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
