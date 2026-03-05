import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import Header from "@/components/header";
import { ChatBubble } from "@/components/ai/chat-bubble";
import { VoiceInput, speakText } from "@/components/ai/voice-input";
import { ModeSelector } from "@/components/ai/mode-selector";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Send,
  Bot,
  MessageSquare,
  Trash2,
  ChevronLeft,
  Sparkles,
  Zap,
} from "lucide-react";

type Mode = "chat" | "voice" | "grammar";

interface Conversation {
  id: number;
  title: string;
  language: string;
  mode: string;
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
  const isEs = language === "es";

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [mode, setMode] = useState<Mode>("chat");
  const [aiLanguage, setAiLanguage] = useState<"spanish" | "english">("spanish");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Mutations
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/conversations", {
        language: aiLanguage,
        mode,
      });
      return res.json();
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setActiveConversationId(data.id);
      setSidebarOpen(false);
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/ai/conversations/${activeConversationId}/messages`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/usage"] });
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
      speakText(text, aiLanguage);
    },
    [aiLanguage]
  );

  // Handle new conversation
  const handleNewConversation = () => {
    createConversationMutation.mutate();
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
        <aside className="hidden md:flex w-72 flex-col bg-white border-r border-gray-200">
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
                transition={{ type: "spring", damping: 25 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 md:hidden flex flex-col shadow-xl"
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
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <button
              className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F59E1C] to-[#e08a0e] flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0A4A6E]">
                  {activeConversation?.title || (isEs ? "Practice Partner" : "Practice Partner")}
                </h2>
                <p className="text-xs text-gray-400">
                  {activeConversation
                    ? `${activeConversation.language === "spanish" ? "Espanol" : "English"} · ${
                        activeConversation.mode === "chat"
                          ? "Chat"
                          : activeConversation.mode === "voice"
                          ? isEs ? "Voz" : "Voice"
                          : isEs ? "Gramatica" : "Grammar"
                      }`
                    : isEs
                    ? "Selecciona o crea una conversacion"
                    : "Select or create a conversation"}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {!activeConversationId ? (
              <EmptyState isEs={isEs} onNew={handleNewConversation} />
            ) : isLoadingMessages ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1C7BB1]" />
              </div>
            ) : messages.length === 0 ? (
              <WelcomeMessage isEs={isEs} mode={mode} aiLanguage={aiLanguage} />
            ) : (
              messages.map((msg, idx) => (
                <ChatBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  corrections={msg.corrections}
                  onSpeak={msg.role === "assistant" ? handleSpeak : undefined}
                  isLatest={idx === messages.length - 1}
                />
              ))
            )}

            {/* Typing indicator */}
            {sendMessageMutation.isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F59E1C] to-[#e08a0e] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {activeConversationId && (
            <div className="bg-white border-t border-gray-200 px-4 py-3">
              {usage && !usage.isSubscribed && usage.remaining <= 3 && usage.remaining > 0 && (
                <p className="text-xs text-amber-600 mb-2 text-center">
                  {isEs
                    ? `Te quedan ${usage.remaining} mensajes gratuitos`
                    : `${usage.remaining} free messages remaining`}
                </p>
              )}
              {usage && !usage.isSubscribed && usage.remaining === 0 && (
                <div className="text-center py-2 mb-2">
                  <p className="text-sm text-red-500 font-medium mb-1">
                    {isEs ? "Has alcanzado el limite de mensajes gratuitos" : "Free message limit reached"}
                  </p>
                  <Button
                    size="sm"
                    className="bg-[#F59E1C] hover:bg-[#e08a0e] text-white"
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
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C7BB1]/30 focus:border-[#1C7BB1] max-h-32"
                  disabled={sendMessageMutation.isPending || (usage ? !usage.isSubscribed && usage.remaining === 0 : false)}
                />
                <button
                  onClick={handleSend}
                  disabled={
                    !inputValue.trim() ||
                    sendMessageMutation.isPending ||
                    (usage ? !usage.isSubscribed && usage.remaining === 0 : false)
                  }
                  className="p-2.5 rounded-full bg-[#1C7BB1] text-white hover:bg-[#0A4A6E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
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
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#0A4A6E]">Practice Partner</h1>
            <p className="text-[10px] text-gray-400">
              {isEs ? "Tu companero de practica 24/7" : "Your 24/7 practice buddy"}
            </p>
          </div>
        </div>

        <Button
          onClick={onNew}
          disabled={isCreating}
          className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white text-sm"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {isCreating
            ? isEs ? "Creando..." : "Creating..."
            : isEs ? "Nueva Conversacion" : "New Conversation"}
        </Button>
      </div>

      {/* Mode & Language */}
      <div className="p-3 space-y-2 border-b border-gray-100">
        <ModeSelector mode={mode} onChange={onModeChange} language={isEs ? "es" : "en"} />
        <div className="flex gap-1">
          <button
            onClick={() => onLanguageChange("spanish")}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              aiLanguage === "spanish"
                ? "bg-[#1C7BB1]/10 text-[#1C7BB1] font-medium"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Espanol
          </button>
          <button
            onClick={() => onLanguageChange("english")}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              aiLanguage === "english"
                ? "bg-[#1C7BB1]/10 text-[#1C7BB1] font-medium"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-2 mb-2">
          {isEs ? "Historial" : "History"}
        </p>
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {isEs ? "Sin conversaciones aun" : "No conversations yet"}
          </p>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeId === conv.id
                    ? "bg-[#1C7BB1]/10 text-[#1C7BB1]"
                    : "text-gray-600 hover:bg-gray-50"
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
        <div className="p-3 border-t border-gray-100">
          {usage.isSubscribed ? (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <Zap className="w-3.5 h-3.5" />
              <span>{isEs ? "Mensajes ilimitados" : "Unlimited messages"}</span>
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{isEs ? "Mensajes gratis" : "Free messages"}</span>
                <span>{usage.remaining}/{usage.limit}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-[#1C7BB1] h-1.5 rounded-full transition-all"
                  style={{ width: `${((usage.limit! - usage.remaining) / usage.limit!) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Empty state when no conversation selected
function EmptyState({ isEs, onNew }: { isEs: boolean; onNew: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] flex items-center justify-center shadow-lg shadow-[#1C7BB1]/20">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-[#0A4A6E] mb-2">
          {isEs ? "Practice Partner" : "Practice Partner"}
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          {isEs
            ? "Tu companero de practica de idiomas con IA. Practica conversacion, pronunciacion y gramatica."
            : "Your AI language practice buddy. Practice conversation, pronunciation, and grammar."}
        </p>
        <Button
          onClick={onNew}
          className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isEs ? "Comenzar a Practicar" : "Start Practicing"}
        </Button>
      </motion.div>
    </div>
  );
}

// Welcome message when conversation is empty
function WelcomeMessage({
  isEs,
  mode,
  aiLanguage,
}: {
  isEs: boolean;
  mode: Mode;
  aiLanguage: "spanish" | "english";
}) {
  const messages: Record<Mode, { es: string; en: string }> = {
    chat: {
      es: "Hola! Soy tu Practice Partner. Hablemos en " + (aiLanguage === "spanish" ? "espanol" : "ingles") + ". Puedes escribirme sobre cualquier tema y yo te ayudare a practicar. Si cometes errores, te los corregire de forma amigable.",
      en: "Hi! I'm your Practice Partner. Let's chat in " + (aiLanguage === "spanish" ? "Spanish" : "English") + ". Write to me about any topic and I'll help you practice. If you make mistakes, I'll gently correct them.",
    },
    voice: {
      es: "Modo de voz activado! Usa el boton del microfono para hablar. Te respondere con frases cortas para que puedas practicar tu pronunciacion.",
      en: "Voice mode activated! Use the microphone button to speak. I'll respond with short phrases so you can practice your pronunciation.",
    },
    grammar: {
      es: "Modo de gramatica! Puedes escribir cualquier texto y yo analizare todos los errores gramaticales en detalle. Tambien puedo darte ejercicios de practica.",
      en: "Grammar mode! Write any text and I'll analyze all grammar errors in detail. I can also give you practice exercises.",
    },
  };

  const msg = isEs ? messages[mode].es : messages[mode].en;

  return (
    <ChatBubble role="assistant" content={msg} />
  );
}
