import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import {
  Bot,
  Send,
  User,
  Loader2,
  Lightbulb,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS_ES = [
  { icon: BookOpen, text: "¿Cómo preparo una clase para nivel A1?" },
  { icon: Lightbulb, text: "Dame 5 actividades para practicar speaking en clase virtual" },
  { icon: Sparkles, text: "¿Cómo motivar a un estudiante que no progresa?" },
];

const QUICK_PROMPTS_EN = [
  { icon: BookOpen, text: "How do I prepare a class for A1 level?" },
  { icon: Lightbulb, text: "Give me 5 activities for practicing speaking in virtual class" },
  { icon: Sparkles, text: "How to motivate a student who isn't progressing?" },
];

export default function TutorAIAssistant() {
  const [, setLocation] = useLocation();
  const user = getCurrentUser();
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isEs = language === "es";

  const isAuthed = isAuthenticated() && !!user;

  const sendMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const newMessages = [...messages, { role: "user" as const, content: userMessage }];
      const res = await apiRequest("POST", "/api/tutor/ai-assistant", {
        messages: newMessages,
        lang: language,
      });
      return res.json();
    },
    onSuccess: (data, userMessage) => {
      setMessages(prev => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: data.reply },
      ]);
    },
    onError: (_, userMessage) => {
      setMessages(prev => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: isEs ? "Lo siento, hubo un error. Intenta de nuevo." : "Sorry, there was an error. Please try again." },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isAuthed) {
    setLocation("/login");
    return null;
  }

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(text);
  };

  const handleQuickPrompt = (text: string) => {
    setInput("");
    sendMutation.mutate(text);
  };

  const quickPrompts = isEs ? QUICK_PROMPTS_ES : QUICK_PROMPTS_EN;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F9FA" }}>
      <Header />

      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {isEs ? "Asistente de Enseñanza" : "Teaching Assistant"}
              </h1>
              <p className="text-xs text-foreground/60">
                {isEs ? "Tu copiloto para preparar clases y mejorar como profesor" : "Your copilot for class prep and teaching improvement"}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 border-0 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-foreground/60 text-center mb-6 max-w-sm">
                  {isEs
                    ? "Pregúntame sobre preparación de clases, metodologías, actividades o cualquier duda sobre la plataforma."
                    : "Ask me about class preparation, methodologies, activities, or any platform questions."}
                </p>
                <div className="space-y-2 w-full max-w-sm">
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(prompt.text)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-primary/15 hover:bg-muted/50 transition-colors text-left"
                    >
                      <prompt.icon className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-accent" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {sendMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-card border border-border rounded-xl px-4 py-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isEs ? "Escribe tu pregunta..." : "Type your question..."}
                className="min-h-[44px] max-h-[120px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
                className="bg-primary hover:bg-primary-900 h-[44px] w-[44px] flex-shrink-0"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
