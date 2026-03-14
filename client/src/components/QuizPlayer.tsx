import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ArrowRight, RotateCcw } from "lucide-react";

interface Question {
  type: "multiple_choice" | "true_false" | "fill_blank" | "ordering";
  question: string;
  questionEs?: string;
  options?: string[];
  optionsEs?: string[];
  correctAnswer: any;
  points?: number;
  explanation?: string;
  explanationEs?: string;
}

interface QuizPlayerProps {
  contentId: number;
  title: string;
  titleEs: string;
  questions: Question[];
  onComplete: (result: { score: number; maxScore: number; passed: boolean }) => void;
  onClose: () => void;
}

export default function QuizPlayer({
  contentId,
  title,
  titleEs,
  questions,
  onComplete,
  onClose,
}: QuizPlayerProps) {
  const { language } = useLanguage();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<any[]>(new Array(questions.length).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; passed: boolean } | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (submittedAnswers: any[]) => {
      const res = await apiRequest("POST", `/api/learning-path/quiz/${contentId}/submit`, {
        answers: submittedAnswers,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setShowResult(true);
      onComplete(data);
    },
  });

  const currentQ = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const qTitle = language === "es" && currentQ.questionEs ? currentQ.questionEs : currentQ.question;
  const options = language === "es" && currentQ.optionsEs ? currentQ.optionsEs : currentQ.options;

  const selectAnswer = (answer: any) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = answer;
    setAnswers(newAnswers);
  };

  const goNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowExplanation(false);
    } else {
      submitMutation.mutate(answers);
    }
  };

  const isAnswered = answers[currentIdx] !== null;

  if (showResult && result) {
    const percent = Math.round((result.score / result.maxScore) * 100);
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
          {result.passed ? (
            <CheckCircle className="mx-auto mb-4" size={64} color="#10b981" />
          ) : (
            <XCircle className="mx-auto mb-4" size={64} color="#ef4444" />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">
          {result.passed
            ? (language === "es" ? "Aprobado!" : "Passed!")
            : (language === "es" ? "Sigue intentando" : "Keep trying")}
        </h2>
        <p className="text-lg text-muted-foreground mb-4">
          {result.score}/{result.maxScore} ({percent}%)
        </p>
        <div className="w-48 mx-auto mb-6">
          <Progress value={percent} className="h-3" />
        </div>
        <div className="flex gap-3 justify-center">
          {!result.passed && (
            <Button
              variant="outline"
              onClick={() => {
                setCurrentIdx(0);
                setAnswers(new Array(questions.length).fill(null));
                setShowResult(false);
                setResult(null);
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {language === "es" ? "Reintentar" : "Retry"}
            </Button>
          )}
          <Button onClick={onClose}>
            {language === "es" ? "Continuar" : "Continue"}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">
          {language === "es" ? titleEs : title}
        </h3>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground font-medium">
            {currentIdx + 1}/{questions.length}
          </span>
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{qTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Multiple Choice */}
              {(currentQ.type === "multiple_choice" || currentQ.type === "true_false") && options && (
                <div className="space-y-2">
                  {options.map((option, i) => {
                    const isSelected = answers[currentIdx] === i;
                    return (
                      <motion.button
                        key={i}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          isSelected
                            ? "border-[#1C7BB1] bg-[#EAF4FA]"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => selectAnswer(i)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="font-medium text-sm text-muted-foreground mr-2">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {option}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Fill in the blank */}
              {currentQ.type === "fill_blank" && (
                <input
                  type="text"
                  className="w-full p-3 border-2 rounded-lg focus:border-[#1C7BB1] focus:outline-none"
                  placeholder={language === "es" ? "Escribe tu respuesta..." : "Type your answer..."}
                  value={answers[currentIdx] || ""}
                  onChange={(e) => selectAnswer(e.target.value)}
                  autoFocus
                />
              )}

              {/* Explanation (if answer submitted and explanation available) */}
              {showExplanation && currentQ.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <p className="text-sm text-blue-800">
                    {language === "es" && currentQ.explanationEs ? currentQ.explanationEs : currentQ.explanation}
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-end mt-4">
        <Button
          onClick={goNext}
          disabled={!isAnswered || submitMutation.isPending}
        >
          {submitMutation.isPending
            ? (language === "es" ? "Enviando..." : "Submitting...")
            : currentIdx < questions.length - 1
              ? (language === "es" ? "Siguiente" : "Next")
              : (language === "es" ? "Finalizar" : "Finish")}
          {!submitMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
