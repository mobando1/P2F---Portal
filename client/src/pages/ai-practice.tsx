import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { ChatBubble } from "@/components/ai/chat-bubble";
import { VoiceInput } from "@/components/ai/voice-input";
import { useTTS } from "@/hooks/use-tts";
import { ModeSelector } from "@/components/ai/mode-selector";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Send,
  MessageSquare,
  Menu,
  Sparkles,
  Zap,
  BarChart3,
  Bookmark,
  BookOpen,
  BookA,
  Flame,
  Trash2,
  X,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LingoMascot } from "@/components/ai/mascot";

type Mode = "chat" | "voice" | "grammar";

interface Conversation {
  id: number;
  title: string;
  language: string;
  mode: string;
  scenario?: string | null;
  createdAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  corrections?: any[] | null;
  createdAt: string;
}

interface UsageData {
  messagesUsed: number;
  remaining: number;
  isSubscribed: boolean;
  limit: number | null;
}

export default function AIPracticePage() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const user = getCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEs = language === "es";

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [mode, setMode] = useState<Mode>("chat");
  const [aiLanguage, setAiLanguage] = useState<"spanish" | "english">("spanish");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"chat" | "progress" | "corrections" | "vocabulary">("chat");
  const [showScenarios, setShowScenarios] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tts = useTTS(aiLanguage);

  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  // Queries
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/ai/conversations"],
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/ai/conversations/${activeConversationId}/messages`],
    enabled: !!activeConversationId,
  });

  const { data: usage } = useQuery<UsageData>({
    queryKey: ["/api/ai/usage"],
  });

  const { data: scenarios = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/scenarios"],
  });

  const { data: progressData } = useQuery<any>({
    queryKey: ["/api/ai/progress"],
    enabled: activePanel === "progress",
  });

  const { data: savedCorrections = [], refetch: refetchCorrections } = useQuery<any[]>({
    queryKey: ["/api/ai/corrections"],
    enabled: activePanel === "corrections",
  });

  const { data: vocabulary = [], refetch: refetchVocabulary } = useQuery<any[]>({
    queryKey: ["/api/ai/vocabulary"],
    enabled: activePanel === "vocabulary",
  });

  const saveCorrectionMutation = useMutation({
    mutationFn: async (data: { original: string; corrected: string; explanation?: string; messageId?: number; language: string }) => {
      const res = await apiRequest("POST", "/api/ai/corrections", data);
      return res.json();
    },
    onSuccess: () => {
      refetchCorrections();
      toast({
        title: isEs ? "Corrección guardada" : "Correction saved",
        description: isEs ? "Puedes revisarla en 'Mis Correcciones'" : "You can review it in 'My Corrections'",
      });
    },
  });

  const deleteCorrectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/ai/corrections/${id}`);
      return res.json();
    },
    onSuccess: () => refetchCorrections(),
  });

  const saveVocabularyMutation = useMutation({
    mutationFn: async (data: { word: string; translation: string; context?: string; language: string }) => {
      const res = await apiRequest("POST", "/api/ai/vocabulary", data);
      return res.json();
    },
    onSuccess: () => {
      refetchVocabulary();
      toast({
        title: isEs ? "Palabra guardada" : "Word saved",
        description: isEs ? "Puedes estudiarla en 'Mi Vocabulario'" : "You can study it in 'My Vocabulary'",
      });
    },
  });

  const deleteVocabularyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/ai/vocabulary/${id}`);
      return res.json();
    },
    onSuccess: () => refetchVocabulary(),
  });

  const updateVocabularyMasteryMutation = useMutation({
    mutationFn: async ({ id, mastery }: { id: number; mastery: number }) => {
      const res = await apiRequest("PATCH", `/api/ai/vocabulary/${id}`, { mastery });
      return res.json();
    },
    onSuccess: () => refetchVocabulary(),
  });

  // Mutations
  const createConversationMutation = useMutation({
    mutationFn: async (scenario?: string) => {
      const res = await apiRequest("POST", "/api/ai/conversations", {
        language: aiLanguage,
        mode,
        scenario: scenario || undefined,
      });
      return res.json();
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setActiveConversationId(data.id);
      setSidebarOpen(false);
      setShowScenarios(false);
      setSelectedScenario(null);
      setActivePanel("chat");
    },
    onError: (error: Error) => {
      toast({
        title: isEs ? "Error" : "Error",
        description: isEs
          ? "No se pudo crear la conversación. Intenta de nuevo."
          : "Could not create conversation. Please try again.",
        variant: "destructive",
      });
      console.error("Create conversation error:", error);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/ai/chat", {
        conversationId: activeConversationId,
        message,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/ai/conversations/${activeConversationId}/messages`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/usage"] });
      // Auto-play AI response in voice mode
      if (mode === "voice" && data.message?.content) {
        tts.speak(data.message.content);
      }
    },
    onError: (error: Error) => {
      toast({
        title: isEs ? "Error al enviar" : "Send failed",
        description: isEs
          ? "No se pudo enviar el mensaje. Intenta de nuevo."
          : "Could not send message. Please try again.",
        variant: "destructive",
      });
      console.error("Send message error:", error);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessageMutation.isPending]);

  // Handle send
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || sendMessageMutation.isPending || !activeConversationId) return;
    setInputValue("");
    sendMessageMutation.mutate(text);
  }, [inputValue, sendMessageMutation, activeConversationId]);

  // Handle voice transcript
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      if (!activeConversationId) return;
      setInputValue((prev) => (prev ? prev + " " + text : text));
    },
    [activeConversationId]
  );

  // Handle speak
  const handleSpeak = useCallback(
    (text: string) => {
      if (tts.isSpeaking) {
        tts.stop();
      } else {
        tts.speak(text);
      }
    },
    [tts]
  );

  // Handle new conversation
  const handleNewConversation = (scenario?: string) => {
    createConversationMutation.mutate(scenario);
  };

  // Select conversation
  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setMode(conv.mode as Mode);
    setAiLanguage(conv.language as "spanish" | "english");
    setSidebarOpen(false);
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-72 flex-col bg-gray-50/80 border-r border-gray-200/60">
          <SidebarContent
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            isCreating={createConversationMutation.isPending}
            mode={mode}
            onModeChange={setMode}
            aiLanguage={aiLanguage}
            onLanguageChange={setAiLanguage}
            usage={usage}
            isEs={isEs}
          />
        </aside>

        {/* Sidebar - Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-gray-50/95 backdrop-blur-lg z-50 md:hidden flex flex-col shadow-2xl"
              >
                <SidebarContent
                  conversations={conversations}
                  activeId={activeConversationId}
                  onSelect={handleSelectConversation}
                  onNew={handleNewConversation}
                  isCreating={createConversationMutation.isPending}
                  mode={mode}
                  onModeChange={setMode}
                  aiLanguage={aiLanguage}
                  onLanguageChange={setAiLanguage}
                  usage={usage}
                  isEs={isEs}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar menu"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center shadow-md shadow-amber-200/40 ring-1 ring-amber-200/50">
                  <LingoMascot size="md" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#0A4A6E]">
                    {activeConversation?.title || "Lingo"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {activeConversation
                      ? `${activeConversation.language === "spanish" ? "Español" : "English"} · ${
                          activeConversation.mode === "chat"
                            ? "Chat"
                            : activeConversation.mode === "voice"
                            ? isEs ? "Voz" : "Voice"
                            : isEs ? "Gramática" : "Grammar"
                        }`
                      : isEs
                      ? "Selecciona o crea una conversación"
                      : "Select or create a conversation"}
                  </p>
                </div>
              </div>
            </div>
            {/* Panel tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActivePanel("chat")}
                className={`p-2 rounded-lg transition-colors ${activePanel === "chat" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                title={isEs ? "Chat" : "Chat"}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePanel("progress")}
                className={`p-2 rounded-lg transition-colors ${activePanel === "progress" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                title={isEs ? "Mi Progreso" : "My Progress"}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePanel("corrections")}
                className={`p-2 rounded-lg transition-colors ${activePanel === "corrections" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                title={isEs ? "Mis Correcciones" : "My Corrections"}
              >
                <Bookmark className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePanel("vocabulary")}
                className={`p-2 rounded-lg transition-colors ${activePanel === "vocabulary" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                title={isEs ? "Mi Vocabulario" : "My Vocabulary"}
              >
                <BookA className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowScenarios(!showScenarios)}
                className={`p-2 rounded-lg transition-colors ${showScenarios ? "bg-amber-50 text-amber-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                title={isEs ? "Escenarios" : "Scenarios"}
              >
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scenarios overlay */}
          <AnimatePresence>
            {showScenarios && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border-b border-gray-200/60 px-4 py-4 overflow-y-auto max-h-[70vh]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#0A4A6E]">
                    {isEs ? "Escenarios de Práctica" : "Practice Scenarios"}
                  </h3>
                  <button onClick={() => setShowScenarios(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                {/* Group scenarios by category */}
                {[
                  { key: "travel", label: isEs ? "Viajes" : "Travel", icon: "✈️" },
                  { key: "work", label: isEs ? "Trabajo" : "Work", icon: "💼" },
                  { key: "social", label: "Social", icon: "🤝" },
                  { key: "daily", label: isEs ? "Cotidiano" : "Daily Life", icon: "🏠" },
                  { key: "academic", label: isEs ? "Académico" : "Academic", icon: "🎓" },
                ].map(({ key, label, icon }) => {
                  const categoryScenarios = scenarios.filter((s: any) => s.category === key);
                  if (categoryScenarios.length === 0) return null;
                  return (
                    <div key={key} className="mb-4 last:mb-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <span>{icon}</span> {label}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {categoryScenarios.map((s: any) => (
                          <motion.button
                            key={s.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleNewConversation(s.id)}
                            disabled={createConversationMutation.isPending}
                            className="text-left p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group disabled:opacity-50"
                          >
                            <span className="text-lg">{s.icon}</span>
                            <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700 mt-1">
                              {isEs ? s.name.es : s.name.en}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {isEs ? s.description.es : s.description.en}
                            </p>
                            <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {s.level}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
            {activePanel === "vocabulary" ? (
              <VocabularyPanel
                vocabulary={vocabulary}
                onDelete={(id) => deleteVocabularyMutation.mutate(id)}
                onUpdateMastery={(id, mastery) => updateVocabularyMasteryMutation.mutate({ id, mastery })}
                isDeleting={deleteVocabularyMutation.isPending}
                isEs={isEs}
              />
            ) : activePanel === "progress" ? (
              <ProgressPanel progressData={progressData} isEs={isEs} />
            ) : activePanel === "corrections" ? (
              <CorrectionsPanel
                corrections={savedCorrections}
                onDelete={(id) => deleteCorrectionMutation.mutate(id)}
                isDeleting={deleteCorrectionMutation.isPending}
                isEs={isEs}
              />
            ) : !activeConversationId ? (
              <EmptyState isEs={isEs} onNew={() => handleNewConversation()} isCreating={createConversationMutation.isPending} />
            ) : isLoadingMessages ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1C7BB1]" />
              </div>
            ) : messages.length === 0 ? (
              <WelcomeMessage
                isEs={isEs}
                mode={mode}
                aiLanguage={aiLanguage}
                onSendPrompt={(text) => sendMessageMutation.mutate(text)}
                isSending={sendMessageMutation.isPending}
                isSubscribed={usage?.isSubscribed ?? false}
              />
            ) : (
              messages.map((msg, idx) => (
                <ChatBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  corrections={msg.corrections}
                  onSpeak={msg.role === "assistant" ? handleSpeak : undefined}
                  isSpeaking={msg.role === "assistant" && idx === messages.length - 1 && tts.isSpeaking}
                  isLatest={idx === messages.length - 1}
                  onSaveCorrection={msg.role === "assistant" ? (correction) => {
                    saveCorrectionMutation.mutate({
                      original: correction.original,
                      corrected: correction.corrected,
                      explanation: correction.explanation,
                      messageId: msg.id,
                      language: activeConversation?.language || "spanish",
                    });
                  } : undefined}
                />
              ))
            )}

            {/* Typing indicator */}
            {sendMessageMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center flex-shrink-0 ring-2 ring-offset-1 ring-amber-200">
                  <LingoMascot size="sm" />
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md shadow-slate-200/50">
                  <div className="flex gap-1.5">
                    <motion.span
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.span
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.span
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {activeConversationId && (
            <div className="bg-white/80 backdrop-blur-lg border-t border-gray-200/60 px-4 py-3">
              {usage && !usage.isSubscribed && usage.remaining <= 5 && usage.remaining > 0 && (
                <div className="flex items-center justify-center gap-2 mb-2 py-2 px-3 rounded-lg bg-amber-50 border border-amber-200/60">
                  <p className="text-xs text-amber-700 font-medium">
                    {isEs
                      ? `Te quedan ${usage.remaining} mensajes hoy.`
                      : `${usage.remaining} messages left today.`}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100 h-6 px-2"
                    onClick={() => setLocation("/packages")}
                  >
                    {isEs ? "Practica sin límites" : "Practice without limits"} →
                  </Button>
                </div>
              )}
              {usage && !usage.isSubscribed && usage.remaining === 0 && (
                <div className="text-center py-3 mb-2 rounded-lg bg-red-50 border border-red-200/60">
                  <p className="text-sm text-red-600 font-semibold mb-1">
                    {isEs ? "Has alcanzado el límite diario" : "Daily limit reached"}
                  </p>
                  <p className="text-xs text-red-500/80 mb-2">
                    {isEs
                      ? "Suscríbete para practicar sin límites, 24/7"
                      : "Subscribe to practice without limits, 24/7"}
                  </p>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#F59E1C] to-[#e08a0e] hover:opacity-90 text-white shadow-md shadow-amber-200/40"
                    onClick={() => setLocation("/packages")}
                  >
                    {isEs ? "Ver Planes" : "View Plans"}
                  </Button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  language={aiLanguage}
                  disabled={sendMessageMutation.isPending || (usage ? !usage.isSubscribed && usage.remaining === 0 : false)}
                />
                <textarea
                  ref={inputRef}
                  aria-label={isEs ? "Escribe tu mensaje" : "Type your message"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    isEs ? "Escribe tu mensaje..." : "Type your message..."
                  }
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 focus:bg-white focus:shadow-md transition-all max-h-32"
                  disabled={sendMessageMutation.isPending || (usage ? !usage.isSubscribed && usage.remaining === 0 : false)}
                />
                <motion.button
                  onClick={handleSend}
                  disabled={
                    !inputValue.trim() ||
                    sendMessageMutation.isPending ||
                    (usage ? !usage.isSubscribed && usage.remaining === 0 : false)
                  }
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-shadow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Sidebar content (shared between desktop and mobile)
function SidebarContent({
  conversations,
  activeId,
  onSelect,
  onNew,
  isCreating,
  mode,
  onModeChange,
  aiLanguage,
  onLanguageChange,
  usage,
  isEs,
}: {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (conv: Conversation) => void;
  onNew: () => void;
  isCreating: boolean;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  aiLanguage: "spanish" | "english";
  onLanguageChange: (l: "spanish" | "english") => void;
  usage?: UsageData;
  isEs: boolean;
}) {
  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200/60">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] flex items-center justify-center shadow-md shadow-blue-300/30">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#0A4A6E]">Lingo</h1>
            <p className="text-[10px] text-gray-400">
              {isEs ? "Tu compañero de práctica 24/7" : "Your 24/7 practice buddy"}
            </p>
          </div>
        </div>

        <motion.button
          onClick={onNew}
          disabled={isCreating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-shadow disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          {isCreating
            ? isEs ? "Creando..." : "Creating..."
            : isEs ? "Nueva Conversación" : "New Conversation"}
        </motion.button>
      </div>

      {/* Mode & Language */}
      <div className="p-3 space-y-2 border-b border-gray-200/60">
        <ModeSelector mode={mode} onChange={onModeChange} language={isEs ? "es" : "en"} />
        <div className="flex gap-1 p-1 bg-gray-100/80 rounded-xl">
          {(["spanish", "english"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => onLanguageChange(lang)}
              className={`relative flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${
                aiLanguage === lang
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {lang === "spanish" ? "Español" : "English"}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-2 mb-2">
          {isEs ? "Historial" : "History"}
        </p>
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {isEs ? "Sin conversaciones aún" : "No conversations yet"}
          </p>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                  activeId === conv.id
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-gray-600 hover:bg-white hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate font-medium">{conv.title}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 ml-5.5">
                  {conv.language === "spanish" ? "ES" : "EN"} · {conv.mode}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Usage footer */}
      {usage && (
        <div className="p-3 border-t border-gray-200/60">
          {usage.isSubscribed ? (
            <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>{isEs ? "Mensajes ilimitados" : "Unlimited messages"}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{isEs ? "Mensajes gratis" : "Free messages"}</span>
                <span className="font-medium">{usage.remaining}/{usage.limit}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((usage.limit! - usage.remaining) / usage.limit!) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full"
                />
              </div>
              <a
                href="/packages"
                className="flex items-center justify-center gap-1.5 mt-2 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 text-xs font-medium text-amber-700 hover:from-amber-100 hover:to-orange-100 transition-all"
              >
                <Zap className="w-3 h-3" />
                {isEs ? "Desbloquea mensajes ilimitados" : "Unlock unlimited messages"}
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Empty state when no conversation selected
function EmptyState({ isEs, onNew, isCreating }: { isEs: boolean; onNew: () => void; isCreating?: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="text-center max-w-sm"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center shadow-xl shadow-amber-200/30 ring-2 ring-amber-200/50"
        >
          <LingoMascot size="lg" />
        </motion.div>
        <h3 className="text-xl font-bold text-[#0A4A6E] mb-2">
          Lingo
        </h3>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          {isEs
            ? "Tu compañero de práctica de idiomas con IA. Practica conversación, pronunciación y gramática."
            : "Your AI language practice buddy. Practice conversation, pronunciation, and grammar."}
        </p>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={onNew}
            disabled={isCreating}
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:opacity-90 text-white shadow-lg shadow-blue-500/25 px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreating
              ? isEs ? "Creando..." : "Creating..."
              : isEs ? "Comenzar a Practicar" : "Start Practicing"}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Prompt suggestions by mode and language
const PROMPT_SUGGESTIONS: Record<Mode, { spanish: string[]; english: string[] }> = {
  chat: {
    spanish: [
      "Cuéntame sobre tu día",
      "¿Qué me recomiendas hacer en Madrid?",
      "Quiero practicar el pasado",
      "Hablemos de películas",
    ],
    english: [
      "Tell me about your day",
      "What do you recommend doing in New York?",
      "I want to practice past tense",
      "Let's talk about movies",
    ],
  },
  voice: {
    spanish: [
      "Hola, ¿cómo estás?",
      "¿Qué tiempo hace hoy?",
      "Preséntate, por favor",
    ],
    english: [
      "Hi, how are you?",
      "What's the weather like today?",
      "Introduce yourself, please",
    ],
  },
  grammar: {
    spanish: [
      "Ayer yo fue al tienda y compré muchos cosas",
      "Explícame el subjuntivo",
      "Dame ejercicios de conjugación",
    ],
    english: [
      "Yesterday I go to the store and buyed many thing",
      "Explain the present perfect to me",
      "Give me conjugation exercises",
    ],
  },
};

// Welcome message when conversation is empty
function WelcomeMessage({
  isEs,
  mode,
  aiLanguage,
  onSendPrompt,
  isSending,
  isSubscribed,
}: {
  isEs: boolean;
  mode: Mode;
  aiLanguage: "spanish" | "english";
  onSendPrompt: (text: string) => void;
  isSending: boolean;
  isSubscribed: boolean;
}) {
  const messages: Record<Mode, { es: string; en: string }> = {
    chat: {
      es: "¡Hola! Soy Lingo, tu compañero de práctica de idiomas. Hablemos en " + (aiLanguage === "spanish" ? "español" : "inglés") + ". Puedes escribirme sobre cualquier tema y yo te ayudaré a practicar. Si cometes errores, te los corregiré de forma amigable.",
      en: "Hi! I'm Lingo, your language practice buddy. Let's chat in " + (aiLanguage === "spanish" ? "Spanish" : "English") + ". Write to me about any topic and I'll help you practice. If you make mistakes, I'll gently correct them.",
    },
    voice: {
      es: "¡Hola! Soy Lingo. ¡Modo de voz activado! Usa el botón del micrófono para hablar. Te responderé con frases cortas para que puedas practicar tu pronunciación.",
      en: "Hi! I'm Lingo. Voice mode activated! Use the microphone button to speak. I'll respond with short phrases so you can practice your pronunciation.",
    },
    grammar: {
      es: "¡Hola! Soy Lingo, tu tutor de gramática. Puedes escribir cualquier texto y yo analizaré todos los errores gramaticales en detalle. También puedo darte ejercicios de práctica.",
      en: "Hi! I'm Lingo, your grammar tutor. Write any text and I'll analyze all grammar errors in detail. I can also give you practice exercises.",
    },
  };

  const msg = isEs ? messages[mode].es : messages[mode].en;
  const suggestions = PROMPT_SUGGESTIONS[mode][aiLanguage];

  return (
    <div className="space-y-5">
      <ChatBubble role="assistant" content={msg} />

      {/* Prompt suggestions */}
      <div className="px-2">
        <p className="text-xs text-gray-400 font-medium mb-2.5 text-center">
          {isEs ? "Prueba con una de estas ideas:" : "Try one of these ideas:"}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((prompt, idx) => (
            <motion.button
              key={prompt}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.08, type: "spring", damping: 20, stiffness: 300 }}
              onClick={() => onSendPrompt(prompt)}
              disabled={isSending}
              className="px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {prompt}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Upgrade banner for free users */}
      {!isSubscribed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mx-auto max-w-sm"
        >
          <a
            href="/packages"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 text-xs text-amber-700 hover:from-amber-100 hover:to-orange-100 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {isEs
                ? "Versión gratuita (10 msgs/día). Suscríbete para práctica ilimitada."
                : "Free version (10 msgs/day). Subscribe for unlimited practice."}
            </span>
          </a>
        </motion.div>
      )}
    </div>
  );
}

// Progress Dashboard Panel
function ProgressPanel({ progressData, isEs }: { progressData: any; isEs: boolean }) {
  if (!progressData) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1C7BB1]" />
      </div>
    );
  }

  const { profile, stats } = progressData;
  const streak = profile?.practiceStreak || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto space-y-5"
    >
      <h3 className="text-lg font-bold text-[#0A4A6E] text-center">
        {isEs ? "Mi Progreso" : "My Progress"}
      </h3>

      {/* Streak */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200/50 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Flame className="w-6 h-6 text-orange-500" />
          <span className="text-3xl font-bold text-orange-600">{streak}</span>
        </div>
        <p className="text-sm text-amber-700 font-medium">
          {isEs ? "Racha de práctica (días)" : "Practice streak (days)"}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200/60 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#1C7BB1]">{stats?.totalConversations || 0}</p>
          <p className="text-[10px] text-gray-500 mt-1">{isEs ? "Conversaciones" : "Conversations"}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200/60 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#1C7BB1]">{stats?.totalMessages || 0}</p>
          <p className="text-[10px] text-gray-500 mt-1">{isEs ? "Mensajes" : "Messages"}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200/60 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#1C7BB1]">{stats?.totalCorrections || 0}</p>
          <p className="text-[10px] text-gray-500 mt-1">{isEs ? "Correcciones" : "Corrections"}</p>
        </div>
      </div>

      {/* Language breakdown */}
      {stats?.languageBreakdown && (
        <div className="bg-white rounded-xl p-4 border border-gray-200/60 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3">{isEs ? "Por idioma" : "By language"}</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Español</span>
                <span className="font-medium">{stats.languageBreakdown.spanish}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-orange-400 to-red-400 h-2 rounded-full transition-all"
                  style={{ width: `${stats.totalConversations ? (stats.languageBreakdown.spanish / stats.totalConversations) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">English</span>
                <span className="font-medium">{stats.languageBreakdown.english}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-400 to-indigo-400 h-2 rounded-full transition-all"
                  style={{ width: `${stats.totalConversations ? (stats.languageBreakdown.english / stats.totalConversations) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode breakdown */}
      {stats?.modeBreakdown && (
        <div className="bg-white rounded-xl p-4 border border-gray-200/60 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3">{isEs ? "Por modo" : "By mode"}</p>
          <div className="flex gap-3">
            {[
              { key: "chat", label: "Chat", color: "from-blue-400 to-blue-500" },
              { key: "voice", label: isEs ? "Voz" : "Voice", color: "from-green-400 to-emerald-500" },
              { key: "grammar", label: isEs ? "Gramática" : "Grammar", color: "from-purple-400 to-violet-500" },
            ].map(({ key, label, color }) => (
              <div key={key} className="flex-1 text-center">
                <p className="text-xl font-bold text-gray-700">{stats.modeBreakdown[key] || 0}</p>
                <div className={`h-1.5 rounded-full bg-gradient-to-r ${color} mt-1 mx-auto`} style={{ width: "60%" }} />
                <p className="text-[10px] text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top errors */}
      {stats?.topErrors && stats.topErrors.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200/60 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3">
            {isEs ? "Errores más frecuentes" : "Most common errors"}
          </p>
          <div className="space-y-2">
            {stats.topErrors.map((err: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-red-500 line-through text-xs">{err.error.split(" → ")[0]}</span>
                <span className="text-green-600 text-xs font-medium">{err.error.split(" → ")[1]}</span>
                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-500">{err.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detected level */}
      {profile?.detectedLevel && (
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-200/60">
            {isEs ? "Nivel estimado" : "Estimated level"}: {profile.detectedLevel}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Saved Corrections Panel
function CorrectionsPanel({
  corrections,
  onDelete,
  isDeleting,
  isEs,
}: {
  corrections: any[];
  onDelete: (id: number) => void;
  isDeleting: boolean;
  isEs: boolean;
}) {
  if (corrections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Bookmark className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">
            {isEs ? "No tienes correcciones guardadas" : "No saved corrections yet"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isEs
              ? "Las correcciones de tus conversaciones aparecerán aquí"
              : "Corrections from your conversations will appear here"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto space-y-3"
    >
      <h3 className="text-lg font-bold text-[#0A4A6E] text-center mb-4">
        {isEs ? "Mis Correcciones" : "My Corrections"}
      </h3>
      {corrections.map((c: any) => (
        <div key={c.id} className="bg-white rounded-xl p-4 border border-gray-200/60 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1">
              <p className="text-sm">
                <span className="text-red-500 line-through">{c.original}</span>
                <span className="mx-2 text-gray-400">→</span>
                <span className="text-green-600 font-medium">{c.corrected}</span>
              </p>
              {c.explanation && (
                <p className="text-xs text-gray-500">{c.explanation}</p>
              )}
              <p className="text-[10px] text-gray-400">
                {c.language === "spanish" ? "ES" : "EN"} · {new Date(c.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => onDelete(c.id)}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// Vocabulary Panel with Flashcard Mode
function VocabularyPanel({
  vocabulary,
  onDelete,
  onUpdateMastery,
  isDeleting,
  isEs,
}: {
  vocabulary: any[];
  onDelete: (id: number) => void;
  onUpdateMastery: (id: number, mastery: number) => void;
  isDeleting: boolean;
  isEs: boolean;
}) {
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [filterMastery, setFilterMastery] = useState<number | null>(null);

  const filtered = filterMastery !== null
    ? vocabulary.filter(v => v.mastery === filterMastery)
    : vocabulary;

  if (flashcardMode && filtered.length > 0) {
    return (
      <FlashcardMode
        vocabulary={filtered}
        onUpdateMastery={onUpdateMastery}
        onExit={() => setFlashcardMode(false)}
        isEs={isEs}
      />
    );
  }

  if (vocabulary.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <BookA className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">
            {isEs ? "No tienes vocabulario guardado" : "No saved vocabulary yet"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isEs
              ? "Las palabras nuevas de tus conversaciones aparecerán aquí"
              : "New words from your conversations will appear here"}
          </p>
        </div>
      </div>
    );
  }

  const masteryLabels = isEs
    ? ["Nuevo", "Visto", "Aprendiendo", "Dominado"]
    : ["New", "Seen", "Learning", "Mastered"];
  const masteryColors = ["bg-gray-200 text-gray-600", "bg-blue-100 text-blue-600", "bg-amber-100 text-amber-600", "bg-green-100 text-green-600"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#0A4A6E]">
          {isEs ? "Mi Vocabulario" : "My Vocabulary"}
        </h3>
        <Button
          size="sm"
          onClick={() => setFlashcardMode(true)}
          disabled={filtered.length === 0}
          className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs shadow-md"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          {isEs ? "Estudiar" : "Study"}
        </Button>
      </div>

      {/* Mastery filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setFilterMastery(null)}
          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
            filterMastery === null ? "bg-blue-100 text-blue-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {isEs ? "Todas" : "All"} ({vocabulary.length})
        </button>
        {[0, 1, 2, 3].map(level => {
          const count = vocabulary.filter(v => v.mastery === level).length;
          if (count === 0) return null;
          return (
            <button
              key={level}
              onClick={() => setFilterMastery(filterMastery === level ? null : level)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                filterMastery === level ? masteryColors[level] + " font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {masteryLabels[level]} ({count})
            </button>
          );
        })}
      </div>

      {/* Word list */}
      <div className="space-y-2">
        {filtered.map((v: any) => (
          <div key={v.id} className="bg-white rounded-xl p-4 border border-gray-200/60 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#0A4A6E]">{v.word}</p>
                  <span className="text-gray-400">→</span>
                  <p className="text-sm text-gray-600">{v.translation}</p>
                </div>
                {v.context && (
                  <p className="text-xs text-gray-400 mt-1 italic truncate">"{v.context}"</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${masteryColors[v.mastery || 0]}`}>
                    {masteryLabels[v.mastery || 0]}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {v.language === "spanish" ? "ES" : "EN"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onDelete(v.id)}
                disabled={isDeleting}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Flashcard Study Mode
function FlashcardMode({
  vocabulary,
  onUpdateMastery,
  onExit,
  isEs,
}: {
  vocabulary: any[];
  onUpdateMastery: (id: number, mastery: number) => void;
  onExit: () => void;
  isEs: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = vocabulary[currentIndex];
  if (!current) return null;

  const handleKnow = () => {
    const newMastery = Math.min(3, (current.mastery || 0) + 1);
    onUpdateMastery(current.id, newMastery);
    goNext();
  };

  const handleRepeat = () => {
    const newMastery = Math.max(0, (current.mastery || 0) - 1);
    onUpdateMastery(current.id, newMastery);
    goNext();
  };

  const goNext = () => {
    setFlipped(false);
    if (currentIndex < vocabulary.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const goPrev = () => {
    setFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto flex flex-col items-center gap-6 py-8"
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          {isEs ? "Volver" : "Back"}
        </button>
        <span className="text-xs text-gray-400 font-medium">
          {currentIndex + 1} / {vocabulary.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <motion.div
          animate={{ width: `${((currentIndex + 1) / vocabulary.length) * 100}%` }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full"
        />
      </div>

      {/* Flashcard */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={() => setFlipped(!flipped)}
        className="w-full aspect-[3/2] max-h-64 bg-white rounded-2xl border-2 border-gray-200/80 shadow-lg hover:shadow-xl transition-shadow cursor-pointer flex flex-col items-center justify-center p-8 select-none"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={flipped ? "back" : "front"}
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            {!flipped ? (
              <>
                <p className="text-2xl font-bold text-[#0A4A6E] mb-2">{current.word}</p>
                <p className="text-xs text-gray-400">
                  {isEs ? "Toca para ver la traducción" : "Tap to see translation"}
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-green-600 mb-1">{current.translation}</p>
                <p className="text-sm text-gray-500">{current.word}</p>
                {current.context && (
                  <p className="text-xs text-gray-400 mt-2 italic">"{current.context}"</p>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Actions */}
      {flipped ? (
        <div className="flex gap-4 w-full">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRepeat}
            className="flex-1 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {isEs ? "Repetir" : "Repeat"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleKnow}
            className="flex-1 py-3 rounded-xl bg-green-50 border border-green-200 text-green-600 font-medium text-sm hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isEs ? "Lo sé" : "I know it"}
          </motion.button>
        </div>
      ) : (
        <div className="flex gap-4 w-full">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="flex-1 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 font-medium text-sm hover:bg-gray-100 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {isEs ? "Anterior" : "Previous"}
          </button>
          <button
            onClick={goNext}
            className="flex-1 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 font-medium text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            {isEs ? "Siguiente" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
