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
import { VoiceInput, speakText } from "@/components/ai/voice-input";
import { ModeSelector } from "@/components/ai/mode-selector";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Send,
  Bot,
  MessageSquare,
  Menu,
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
  const { toast } = useToast();
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/ai/conversations/${activeConversationId}/messages`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/usage"] });
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
          <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 px-4 py-3 flex items-center gap-3">
            <button
              className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200/40">
                <Bot className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0A4A6E]">
                  {activeConversation?.title || "Practice Partner"}
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
            {!activeConversationId ? (
              <EmptyState isEs={isEs} onNew={handleNewConversation} isCreating={createConversationMutation.isPending} />
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 ring-2 ring-offset-1 ring-amber-200">
                  <Bot className="w-3.5 h-3.5 text-white" />
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
              {usage && !usage.isSubscribed && usage.remaining <= 3 && usage.remaining > 0 && (
                <p className="text-xs text-amber-600 mb-2 text-center font-medium">
                  {isEs
                    ? `Te quedan ${usage.remaining} mensajes gratuitos`
                    : `${usage.remaining} free messages remaining`}
                </p>
              )}
              {usage && !usage.isSubscribed && usage.remaining === 0 && (
                <div className="text-center py-2 mb-2">
                  <p className="text-sm text-red-500 font-medium mb-1">
                    {isEs ? "Has alcanzado el límite de mensajes gratuitos" : "Free message limit reached"}
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
            <h1 className="text-sm font-bold text-[#0A4A6E]">Practice Partner</h1>
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
            <div>
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
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] flex items-center justify-center shadow-xl shadow-blue-500/20"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>
        <h3 className="text-xl font-bold text-[#0A4A6E] mb-2">
          Practice Partner
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
      es: "¡Hola! Soy tu Practice Partner. Hablemos en " + (aiLanguage === "spanish" ? "español" : "inglés") + ". Puedes escribirme sobre cualquier tema y yo te ayudaré a practicar. Si cometes errores, te los corregiré de forma amigable.",
      en: "Hi! I'm your Practice Partner. Let's chat in " + (aiLanguage === "spanish" ? "Spanish" : "English") + ". Write to me about any topic and I'll help you practice. If you make mistakes, I'll gently correct them.",
    },
    voice: {
      es: "¡Modo de voz activado! Usa el botón del micrófono para hablar. Te responderé con frases cortas para que puedas practicar tu pronunciación.",
      en: "Voice mode activated! Use the microphone button to speak. I'll respond with short phrases so you can practice your pronunciation.",
    },
    grammar: {
      es: "¡Modo de gramática! Puedes escribir cualquier texto y yo analizaré todos los errores gramaticales en detalle. También puedo darte ejercicios de práctica.",
      en: "Grammar mode! Write any text and I'll analyze all grammar errors in detail. I can also give you practice exercises.",
    },
  };

  const msg = isEs ? messages[mode].es : messages[mode].en;

  return (
    <ChatBubble role="assistant" content={msg} />
  );
}
