import { useState } from "react";

interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

interface GrammarHighlightProps {
  content: string;
  corrections: GrammarCorrection[];
}

export function GrammarHighlight({ content, corrections }: GrammarHighlightProps) {
  const [activeCorrection, setActiveCorrection] = useState<number | null>(null);

  if (!corrections || corrections.length === 0) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  // Clean correction markers from the displayed text
  let cleanContent = content;
  // Remove [correction: "x" -> "y"] patterns from display
  cleanContent = cleanContent.replace(/\[correction:\s*"[^"]+"\s*→\s*"[^"]+"\]/g, "");
  // Remove ERROR/CORRECT/RULE patterns from display
  cleanContent = cleanContent.replace(/ERROR:\s*"[^"]+"\s*→\s*CORRECT:\s*"[^"]+"\s*—\s*RULE:\s*.+?(?:\n|$)/g, "");

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
