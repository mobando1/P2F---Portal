import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { pageTransition, fadeInUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, GraduationCap, ArrowRight } from "lucide-react";
import LevelBadge from "@/components/LevelBadge";
import { useLocation } from "wouter";
import { getCurrentUser } from "@/lib/auth";

interface Question {
  id: number;
  level: string;
  question: string;
  questionEs: string;
  options: string[];
}

interface PlacementResult {
  level: string;
  scores: Record<string, { correct: number; total: number }>;
  totalCorrect: number;
  totalQuestions: number;
}

export default function PlacementTestPage() {
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<PlacementResult | null>(null);

  const { data, isLoading } = useQuery<{ questions: Question[] }>({
    queryKey: ["/api/placement-test"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const submitMutation = useMutation({
    mutationFn: async (answerList: { questionId: number; answer: number }[]) => {
      const res = await apiRequest("POST", "/api/placement-test/submit", { answers: answerList });
      return res.json();
    },
    onSuccess: (data: PlacementResult) => {
      setResult(data);
      // Update cached user
      const user = getCurrentUser();
      if (user) {
        user.level = data.level;
        localStorage.setItem("p2f_user", JSON.stringify(user));
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F8F9FA" }}>
        <Loader2 className="animate-spin h-8 w-8 text-[#1C7BB1]" />
      </div>
    );
  }

  const questions = data?.questions || [];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  // Result screen
  if (result) {
    const levelDescriptions: Record<string, { en: string; es: string }> = {
      A1: { en: "Beginner — You're just starting your Spanish journey!", es: "Principiante — ¡Estás comenzando tu viaje en español!" },
      A2: { en: "Elementary — You have basic Spanish knowledge!", es: "Elemental — ¡Tienes conocimientos básicos de español!" },
      B1: { en: "Intermediate — You can handle everyday conversations!", es: "Intermedio — ¡Puedes manejar conversaciones cotidianas!" },
      B2: { en: "Upper Intermediate — You communicate with confidence!", es: "Intermedio Alto — ¡Te comunicas con confianza!" },
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#F8F9FA" }}>
        <motion.div
          variants={pageTransition}
          initial="hidden"
          animate="visible"
          className="max-w-lg w-full"
        >
          <Card className="border-0 shadow-xl overflow-hidden">
            {/* Header gradient */}
            <div className="bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] p-8 text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4" />
              </motion.div>
              <h1 className="text-2xl font-bold mb-2">
                {language === "es" ? "¡Test Completado!" : "Test Complete!"}
              </h1>
              <p className="text-white/80">
                {result.totalCorrect}/{result.totalQuestions} {language === "es" ? "respuestas correctas" : "correct answers"}
              </p>
            </div>

            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {language === "es" ? "Tu nivel asignado" : "Your assigned level"}
              </p>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="mb-4"
              >
                <LevelBadge level={result.level} size="lg" animate />
              </motion.div>
              <p className="text-muted-foreground mb-6">
                {levelDescriptions[result.level]?.[language] || levelDescriptions.A1[language]}
              </p>

              {/* Score breakdown */}
              <div className="grid grid-cols-4 gap-2 mb-8">
                {(["A1", "A2", "B1", "B2"] as const).map((level) => {
                  const score = result.scores[level];
                  const pct = score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
                  return (
                    <div key={level} className="text-center">
                      <LevelBadge level={level} size="sm" />
                      <p className="text-lg font-bold mt-1">{pct}%</p>
                      <p className="text-xs text-muted-foreground">
                        {score?.correct || 0}/{score?.total || 0}
                      </p>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={() => navigate("/learning-path")}
                className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
                size="lg"
              >
                {language === "es" ? "Comenzar mi camino" : "Start my learning path"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const handleSelect = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleSubmit = () => {
    const answerList = Object.entries(answers).map(([questionId, answer]) => ({
      questionId: Number(questionId),
      answer,
    }));
    submitMutation.mutate(answerList);
  };

  const selectedAnswer = answers[currentQuestion.id];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#F8F9FA" }}>
      <motion.div
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        className="max-w-xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <GraduationCap className="h-10 w-10 mx-auto text-[#1C7BB1] mb-2" />
          <h1 className="text-2xl font-bold text-[#0A4A6E]">
            {language === "es" ? "Test de Colocación" : "Placement Test"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {language === "es"
              ? "Responde las preguntas para determinar tu nivel de español"
              : "Answer the questions to determine your Spanish level"}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>
              {language === "es" ? "Pregunta" : "Question"} {currentIndex + 1}/{totalQuestions}
            </span>
            <LevelBadge level={currentQuestion.level} size="sm" />
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg font-semibold mb-6 text-[#0A4A6E]">
                  {language === "es" ? currentQuestion.questionEs : currentQuestion.question}
                </h2>

                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedAnswer === idx
                          ? "border-[#1C7BB1] bg-[#EAF4FA] text-[#0A4A6E] font-medium"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mr-3 ${
                        selectedAnswer === idx
                          ? "bg-[#1C7BB1] text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {language === "es" ? "Anterior" : "Previous"}
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={answeredCount < totalQuestions || submitMutation.isPending}
              className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
            >
              {submitMutation.isPending ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {language === "es" ? "Enviar" : "Submit"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={selectedAnswer === undefined}
              className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
            >
              {language === "es" ? "Siguiente" : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Answer count indicator */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {answeredCount}/{totalQuestions} {language === "es" ? "respondidas" : "answered"}
        </p>
      </motion.div>
    </div>
  );
}
