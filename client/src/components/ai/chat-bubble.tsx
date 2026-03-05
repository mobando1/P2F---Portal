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
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-[#1C7BB1] text-white"
            : "bg-gradient-to-br from-[#F59E1C] to-[#e08a0e] text-white"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[#1C7BB1] text-white rounded-tr-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
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
            className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-[#1C7BB1] transition-colors"
          >
            <Volume2 className="w-3 h-3" />
            <span>Listen</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
