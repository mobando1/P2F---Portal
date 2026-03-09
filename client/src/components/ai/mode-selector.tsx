import { motion } from "framer-motion";
import { MessageSquare, Mic, BookOpen } from "lucide-react";

type Mode = "chat" | "voice" | "grammar";

interface ModeSelectorProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  language: "es" | "en";
}

const modes: { id: Mode; icon: typeof MessageSquare; labelEs: string; labelEn: string }[] = [
  { id: "chat", icon: MessageSquare, labelEs: "Chat", labelEn: "Chat" },
  { id: "voice", icon: Mic, labelEs: "Voz", labelEn: "Voice" },
  { id: "grammar", icon: BookOpen, labelEs: "Gramatica", labelEn: "Grammar" },
];

export function ModeSelector({ mode, onChange, language }: ModeSelectorProps) {
  return (
    <div className="relative flex gap-0.5 p-1 bg-gray-100/80 rounded-xl">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors z-10 flex-1 justify-center"
          >
            {isActive && (
              <motion.div
                layoutId="mode-pill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              />
            )}
            <span className={`relative flex items-center gap-1.5 ${
              isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{language === "es" ? m.labelEs : m.labelEn}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
