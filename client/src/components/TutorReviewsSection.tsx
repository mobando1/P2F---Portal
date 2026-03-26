import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Star, MessageSquare, Loader2, Send, UserCircle } from "lucide-react";

interface ReviewData {
  id: number;
  rating: number;
  comment: string | null;
  userName: string;
  userAvatar: string | null;
  tutorResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
}

interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  distribution: Array<{ stars: number; count: number }>;
}

export default function TutorReviewsSection() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEs = language === "es";
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");

  const { data, isLoading } = useQuery<{ reviews: ReviewData[]; summary: ReviewSummary }>({
    queryKey: ["/api/tutor/reviews"],
    queryFn: () => apiRequest("GET", "/api/tutor/reviews").then(r => r.json()),
  });

  const respondMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: number; response: string }) => {
      const res = await apiRequest("PUT", `/api/tutor/reviews/${reviewId}/respond`, { response });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/reviews"] });
      setRespondingTo(null);
      setResponseText("");
      toast({ title: isEs ? "Respuesta enviada" : "Response sent" });
    },
    onError: () => {
      toast({ title: "Error", description: isEs ? "No se pudo enviar la respuesta." : "Could not send response.", variant: "destructive" });
    },
  });

  const reviews = data?.reviews || [];
  const summary = data?.summary;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-[#F59E1C] fill-[#F59E1C]" />
          <h3 className="font-semibold text-[#0A4A6E]">{isEs ? "Mis Reseñas" : "My Reviews"}</h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin h-5 w-5 text-[#1C7BB1]" /></div>
        ) : !summary || reviews.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">{isEs ? "Sin reseñas aún" : "No reviews yet"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-6 p-3 bg-[#EAF4FA] rounded-lg">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#0A4A6E]">{summary.averageRating.toFixed(1)}</p>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(summary.averageRating) ? "fill-[#F59E1C] text-[#F59E1C]" : "text-gray-300"}`} />
                  ))}
                </div>
                <p className="text-xs text-[#0A4A6E]/60 mt-0.5">{summary.totalReviews} {isEs ? "reseñas" : "reviews"}</p>
              </div>
              <div className="flex-1 space-y-1">
                {summary.distribution.map(d => (
                  <div key={d.stars} className="flex items-center gap-2">
                    <span className="text-xs text-[#0A4A6E]/60 w-4">{d.stars}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F59E1C] rounded-full"
                        style={{ width: `${summary.totalReviews > 0 ? (d.count / summary.totalReviews) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#0A4A6E]/60 w-4">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews list */}
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="p-3 rounded-lg border border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {r.userAvatar ? (
                        <img src={r.userAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="h-5 w-5 text-[#1C7BB1]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#0A4A6E]">{r.userName}</p>
                        <span className="text-[10px] text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "fill-[#F59E1C] text-[#F59E1C]" : "text-gray-300"}`} />
                        ))}
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}

                      {/* Tutor response */}
                      {r.tutorResponse && (
                        <div className="mt-2 ml-4 p-2 bg-[#EAF4FA]/50 rounded-md border-l-2 border-[#1C7BB1]">
                          <p className="text-[10px] text-[#1C7BB1] font-semibold">{isEs ? "Tu respuesta" : "Your response"}</p>
                          <p className="text-xs text-[#0A4A6E] mt-0.5">{r.tutorResponse}</p>
                        </div>
                      )}

                      {/* Respond button */}
                      {!r.tutorResponse && (
                        respondingTo === r.id ? (
                          <div className="mt-2 flex gap-2">
                            <Textarea
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder={isEs ? "Tu respuesta..." : "Your response..."}
                              className="text-xs min-h-[60px]"
                              rows={2}
                            />
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                className="h-7 bg-[#1C7BB1] hover:bg-[#0A4A6E]"
                                disabled={!responseText.trim() || respondMutation.isPending}
                                onClick={() => respondMutation.mutate({ reviewId: r.id, response: responseText })}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7" onClick={() => { setRespondingTo(null); setResponseText(""); }}>
                                X
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="mt-1 text-xs text-[#1C7BB1] hover:text-[#0A4A6E] flex items-center gap-1"
                            onClick={() => { setRespondingTo(r.id); setResponseText(""); }}
                          >
                            <MessageSquare className="h-3 w-3" />
                            {isEs ? "Responder" : "Respond"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
