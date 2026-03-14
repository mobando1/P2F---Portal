import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Brain, Video, Dumbbell, Check, Trophy, Loader2, ArrowLeft } from "lucide-react";
import LevelBadge from "./LevelBadge";
import QuizPlayer from "./QuizPlayer";

interface StationDetailProps {
  stationId: number | null;
  open: boolean;
  onClose: () => void;
  onStationCompleted: () => void;
}

const CONTENT_ICONS: Record<string, any> = {
  document: FileText,
  quiz: Brain,
  video: Video,
  exercise: Dumbbell,
};

export default function StationDetail({ stationId, open, onClose, onStationCompleted }: StationDetailProps) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [activeDoc, setActiveDoc] = useState<any>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/learning-path/stations", stationId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!stationId && open,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/learning-path/stations/${stationId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-path"] });
      onStationCompleted();
    },
  });

  if (!stationId) return null;

  const station = data?.station;
  const content = data?.content || [];
  const progress = data?.progress;

  const stationTitle = station
    ? (language === "es" ? station.titleEs : station.title)
    : "";
  const stationDesc = station
    ? (language === "es" ? station.descriptionEs : station.description)
    : "";

  const isCompleted = progress?.status === "completed";
  const isLocked = progress?.status === "locked";

  // Check if all content items have been completed (all quizzes passed)
  const allQuizzesPassed = content
    .filter((c: any) => c.contentType === "quiz")
    .every((c: any) => c.bestScore !== null && c.bestScore >= 70);

  const canComplete = !isCompleted && !isLocked && allQuizzesPassed;

  if (activeDoc) {
    const docTitle = language === "es" ? activeDoc.titleEs : activeDoc.title;
    const docText = language === "es"
      ? (activeDoc.contentData?.textEs || activeDoc.contentData?.text || "")
      : (activeDoc.contentData?.text || "");
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveDoc(null)}>
                <ArrowLeft size={16} />
              </Button>
              <DialogTitle className="text-base">{docTitle}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="prose prose-sm max-w-none dark:prose-invert mt-2 pb-4">
            <ReactMarkdown>{docText}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (activeQuiz) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <QuizPlayer
            contentId={activeQuiz.id}
            title={activeQuiz.title}
            titleEs={activeQuiz.titleEs}
            questions={activeQuiz.contentData?.questions || []}
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/learning-path/stations", stationId] });
            }}
            onClose={() => setActiveQuiz(null)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {station && <LevelBadge level={station.level} size="sm" />}
            <DialogTitle>{stationTitle}</DialogTitle>
          </div>
          {stationDesc && (
            <p className="text-sm text-muted-foreground mt-1">{stationDesc}</p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {content.map((item: any, idx: number) => {
              const Icon = CONTENT_ICONS[item.contentType] || FileText;
              const itemTitle = language === "es" ? item.titleEs : item.title;
              const isQuiz = item.contentType === "quiz";
              const isDoc = item.contentType === "document";
              const quizPassed = item.bestScore !== null && item.bestScore >= 70;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className={`cursor-pointer transition-shadow hover:shadow-md ${
                      quizPassed ? "border-green-200 bg-green-50/50" : ""
                    }`}
                    onClick={() => {
                      if (isQuiz && item.contentData?.questions) {
                        setActiveQuiz(item);
                      } else if (isDoc && item.contentData?.text) {
                        setActiveDoc(item);
                      }
                    }}
                  >
                    <CardContent className="flex items-center gap-3 py-3 px-4">
                      <div className={`p-2 rounded-lg ${quizPassed ? "bg-green-100" : "bg-gray-100"}`}>
                        <Icon size={18} className={quizPassed ? "text-green-600" : "text-gray-600"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{itemTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.durationMinutes} min
                          {isQuiz && item.bestScore !== null && ` • ${language === "es" ? "Mejor:" : "Best:"} ${item.bestScore}%`}
                        </p>
                      </div>
                      {quizPassed && <Check size={18} className="text-green-500" />}
                      {isQuiz && !quizPassed && (
                        <Button size="sm" variant="outline">
                          {item.attempts?.length > 0
                            ? (language === "es" ? "Reintentar" : "Retry")
                            : (language === "es" ? "Iniciar" : "Start")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Complete station button */}
            {canComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="pt-4"
              >
                <Button
                  className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E]"
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <Trophy className="mr-2 h-4 w-4" />
                  )}
                  {language === "es" ? "Completar Estacion" : "Complete Station"}
                </Button>
              </motion.div>
            )}

            {isCompleted && (
              <div className="text-center py-4 text-green-600 font-medium flex items-center justify-center gap-2">
                <Check size={20} />
                {language === "es" ? "Estacion completada" : "Station completed"}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
