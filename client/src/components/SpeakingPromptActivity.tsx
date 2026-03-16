import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Mic, Lightbulb, Trophy, MessageCircle } from "lucide-react";

interface SpeakingPrompt {
  text: string;
  textEs: string;
  tip?: string;
  tipEs?: string;
  aiScenarioId?: string;
}

interface SpeakingPromptActivityProps {
  contentId: number;
  title: string;
  titleEs: string;
  prompts: SpeakingPrompt[];
  onComplete: () => void;
  onClose: () => void;
}

export default function SpeakingPromptActivity({
  title,
  titleEs,
  prompts,
  onClose,
}: SpeakingPromptActivityProps) {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const es = language === "es";
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const progress = Math.round((currentIdx / prompts.length) * 100);
  const prompt = prompts[currentIdx];

  const handlePracticed = () => {
    if (currentIdx < prompts.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setShowCompletion(true);
    }
  };

  const handleLingo = (scenarioId: string) => {
    setLocation(`/ai-practice?scenario=${scenarioId}`);
  };

  if (!prompts.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {es ? "No hay ejercicios disponibles." : "No prompts available."}
      </div>
    );
  }

  if (showCompletion) {
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
          <Trophy className="mx-auto mb-4" size={64} color="#F59E1C" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">
          {es ? "¡Excelente práctica!" : "Great practice!"}
        </h2>
        <p className="text-muted-foreground mb-6">
          {es
            ? `Practicaste ${prompts.length} situaciones de conversación`
            : `You practiced ${prompts.length} conversation situations`}
        </p>
        <Button onClick={onClose}>
          {es ? "Continuar" : "Continue"}
        </Button>
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
            {currentIdx + 1}/{prompts.length}
          </span>
        </div>
      </div>

      {/* Prompt card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18 }}
          className="space-y-3"
        >
          {/* Situation */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                {es ? "Tu situación" : "Your situation"}
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-base leading-relaxed">
                {es ? prompt.textEs : prompt.text}
              </p>
            </CardContent>
          </Card>

          {/* Speaking cue */}
          <div className="flex items-start gap-3 bg-[#EAF4FA] border-l-4 border-[#1C7BB1] rounded-r-lg p-3">
            <Mic size={18} className="text-[#1C7BB1] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#0A4A6E] font-medium">
              {es
                ? "Intenta decirlo en voz alta en español"
                : "Try to say it out loud in Spanish"}
            </p>
          </div>

          {/* Grammar/vocab tip */}
          {(prompt.tip || prompt.tipEs) && (
            <div className="flex items-start gap-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3">
              <Lightbulb size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                {es && prompt.tipEs ? prompt.tipEs : prompt.tip}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Buttons */}
      <div className="space-y-2 mt-4">
        <Button className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E]" onClick={handlePracticed}>
          ✓ {es ? "¡Lo practiqué!" : "I practiced it!"}
        </Button>
        {prompt.aiScenarioId && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleLingo(prompt.aiScenarioId!)}
          >
            <MessageCircle size={16} className="mr-2" />
            {es ? "Practicar con Lingo →" : "Practice with Lingo →"}
          </Button>
        )}
      </div>
    </div>
  );
}
