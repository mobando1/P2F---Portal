import { useState } from "react";
import { Bookmark, Check } from "lucide-react";

interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

interface GrammarHighlightProps {
  content: string;
  corrections: GrammarCorrection[];
  onSaveCorrection?: (correction: GrammarCorrection) => void;
}

export function GrammarHighlight({ content, corrections, onSaveCorrection }: GrammarHighlightProps) {
  const [activeCorrection, setActiveCorrection] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());

  if (!corrections || corrections.length === 0) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  // Clean correction and vocab markers from the displayed text
  let cleanContent = content;
  // Remove [correction: "x" -> "y"] patterns from display
  cleanContent = cleanContent.replace(/\[correction:\s*"[^"]+"\s*→\s*"[^"]+"\]/g, "");
  // Remove ERROR/CORRECT/RULE patterns from display
  cleanContent = cleanContent.replace(/ERROR:\s*"[^"]+"\s*→\s*CORRECT:\s*"[^"]+"\s*—\s*RULE:\s*.+?(?:\n|$)/g, "");
  // Remove [vocab: "word" = "translation"] patterns from display
  cleanContent = cleanContent.replace(/\[vocab:\s*"[^"]+"\s*=\s*"[^"]+"\]/g, "");

  const handleSave = (correction: GrammarCorrection, idx: number) => {
    if (onSaveCorrection) {
      onSaveCorrection(correction);
      setSavedIndices(prev => new Set(prev).add(idx));
    }
  };

  return (
    <div className="text-sm leading-relaxed">
      <p className="whitespace-pre-wrap">{cleanContent.trim()}</p>

      {corrections.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-[#1C7BB1] uppercase tracking-wide">Corrections</p>
          {corrections.map((correction, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2 text-xs cursor-pointer group"
              onClick={() => setActiveCorrection(activeCorrection === idx ? null : idx)}
            >
              <span className="line-through text-red-400 bg-red-50 px-1.5 py-0.5 rounded">
                {correction.original}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">
                {correction.corrected}
              </span>
              {onSaveCorrection && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(correction, idx);
                  }}
                  disabled={savedIndices.has(idx)}
                  className={`p-1 rounded transition-colors ${
                    savedIndices.has(idx)
                      ? "text-green-500"
                      : "text-gray-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100"
                  }`}
                  title={savedIndices.has(idx) ? "Saved" : "Save correction"}
                >
                  {savedIndices.has(idx) ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Bookmark className="w-3 h-3" />
                  )}
                </button>
              )}
              {activeCorrection === idx && correction.explanation && (
                <p className="w-full text-gray-500 text-xs mt-1 pl-2 border-l-2 border-[#1C7BB1]/30">
                  {correction.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
