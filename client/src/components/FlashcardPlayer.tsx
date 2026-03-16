import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowLeft, RotateCcw } from "lucide-react";

interface FlashCard {
  front: string;
  back: string;
  example?: string;
  exampleEs?: string;
}

interface FlashcardPlayerProps {
  contentId: number;
  title: string;
  titleEs: string;
  cards: FlashCard[];
  onComplete: () => void;
  onClose: () => void;
}

export default function FlashcardPlayer({
  title,
  titleEs,
  cards,
  onClose,
}: FlashcardPlayerProps) {
  const { language } = useLanguage();
  const es = language === "es";
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<("again" | "got_it")[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);

  const progress = Math.round((currentIdx / cards.length) * 100);
  const card = cards[currentIdx];

  const handleResult = (outcome: "again" | "got_it") => {
    const newResults = [...results, outcome];
    setResults(newResults);
    setIsFlipped(false);

    if (currentIdx < cards.length - 1) {
      setTimeout(() => setCurrentIdx(currentIdx + 1), 150);
    } else {
      setTimeout(() => setShowCompletion(true), 150);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setIsFlipped(false);
    setResults([]);
    setShowCompletion(false);
  };

  if (!cards.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {es ? "No hay tarjetas disponibles." : "No cards available."}
      </div>
    );
  }

  if (showCompletion) {
    const gotItCount = results.filter((r) => r === "got_it").length;
    const masteredPercent = Math.round((gotItCount / cards.length) * 100);
    const passed = masteredPercent >= 70;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          <CheckCircle
            className="mx-auto mb-4"
            size={64}
            color={passed ? "#10b981" : "#F59E1C"}
          />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">
          {es ? "¡Sesión completa!" : "Session complete!"}
        </h2>
        <p className="text-lg text-muted-foreground mb-1">
          {gotItCount}/{cards.length}{" "}
          {es ? "dominadas" : "mastered"}
        </p>
        <p className="text-3xl font-bold mb-4" style={{ color: passed ? "#10b981" : "#F59E1C" }}>
          {masteredPercent}%
        </p>
        <div className="w-48 mx-auto mb-6">
          <Progress value={masteredPercent} className="h-3" />
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {es ? "Practicar de nuevo" : "Practice again"}
          </Button>
          <Button onClick={onClose}>
            {es ? "Continuar" : "Continue"}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <ArrowLeft size={16} />
          </Button>
          <h3 className="text-lg font-semibold">{es ? titleEs : title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground font-medium">
            {currentIdx + 1}/{cards.length}
          </span>
        </div>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18 }}
        >
          {/* 3D flip card */}
          <div
            className="cursor-pointer select-none"
            style={{ perspective: "1000px" }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d", position: "relative" }}
              className="h-52"
            >
              {/* Front face */}
              <div
                className="absolute inset-0 rounded-xl border-2 border-gray-200 bg-white flex flex-col items-center justify-center p-6"
                style={{ backfaceVisibility: "hidden" }}
              >
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
                  {es ? "Palabra / Frase" : "Word / Phrase"}
                </p>
                <p className="text-2xl font-bold text-center text-[#0A4A6E]">
                  {card.front}
                </p>
                <p className="text-xs text-muted-foreground mt-6">
                  {es ? "Toca para revelar" : "Tap to reveal"}
                </p>
              </div>

              {/* Back face */}
              <div
                className="absolute inset-0 rounded-xl border-2 border-[#1C7BB1] bg-[#EAF4FA] flex flex-col items-center justify-center p-6"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <p className="text-2xl font-bold text-center text-[#0A4A6E] mb-3">
                  {card.back}
                </p>
                {(card.example || card.exampleEs) && (
                  <>
                    <div className="w-12 h-px bg-[#1C7BB1]/30 mb-3" />
                    <p className="text-sm italic text-center text-[#1C7BB1]">
                      {es && card.exampleEs ? card.exampleEs : card.example}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Action buttons — only visible when flipped */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="flex gap-3 mt-4"
          >
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              onClick={() => handleResult("again")}
            >
              🔁 {es ? "Otra vez" : "Again"}
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleResult("got_it")}
            >
              ✓ {es ? "¡Lo sé!" : "Got it!"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {!isFlipped && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          {es ? "Toca la tarjeta para verla" : "Tap the card to flip it"}
        </p>
      )}
    </div>
  );
}
