import { useState } from "react";
import { Bookmark, Check, BookA } from "lucide-react";

interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

interface VocabItem {
  word: string;
  translation: string;
}

interface GrammarHighlightProps {
  content: string;
  corrections: GrammarCorrection[];
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

export function GrammarHighlight({ content, corrections, onSaveCorrection, onSaveVocab }: GrammarHighlightProps) {
  const [activeCorrection, setActiveCorrection] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [savedVocab, setSavedVocab] = useState<Set<string>>(new Set());

  const vocabItems = extractVocabMarkers(content);

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
  cleanContent = cleanContent.replace(/\s*\[vocab:\s*"[^"]+"\s*=\s*"[^"]+"\]\s*/g, " ").replace(/\s{2,}/g, " ");

  const handleSave = (correction: GrammarCorrection, idx: number) => {
    if (onSaveCorrection) {
      onSaveCorrection(correction);
      setSavedIndices(prev => new Set(prev).add(idx));
    }
  };

  const handleSaveVocab = (item: VocabItem) => {
    if (onSaveVocab) {
      onSaveVocab(item);
      setSavedVocab(prev => new Set(prev).add(item.word));
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

      {/* Vocabulary section */}
      {vocabItems.length > 0 && onSaveVocab && (
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
    </div>
  );
}
