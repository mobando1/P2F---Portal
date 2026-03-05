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
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? "bg-white text-[#1C7BB1] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{language === "es" ? m.labelEs : m.labelEn}</span>
          </button>
        );
      })}
    </div>
  );
}
