import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  UserCircle,
} from "lucide-react";

interface ConversationItem {
  id: number;
  participant: {
    id: number;
    name: string;
    avatar: string | null;
    userType: string;
  };
  lastMessage: { message: string; createdAt: string; senderId: number } | null;
  unreadCount: number;
  lastMessageAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const [, setLocation] = useLocation();
  const user = getCurrentUser();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  const { data: conversations, isLoading } = useQuery<ConversationItem[]>({
    queryKey: ["/api/messages/conversations"],
    queryFn: () => apiRequest("GET", "/api/messages/conversations").then(r => r.json()),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversations", selectedConvId],
    queryFn: () => apiRequest("GET", `/api/messages/conversations/${selectedConvId}`).then(r => r.json()),
    enabled: selectedConvId !== null,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", `/api/messages/conversations/${selectedConvId}`, { message }).then(r => r.json()),
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations", selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: () => {
      toast({
        title: language === "es" ? "Error" : "Error",
        description: language === "es" ? "No se pudo enviar el mensaje. Intenta de nuevo." : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConv = conversations?.find(c => c.id === selectedConvId);

  function formatRelativeTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return language === "es" ? "ahora" : "now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffH < 24) return `${diffH}h`;
    if (diffD < 7) return language === "es" ? `${diffD}d` : `${diffD}d`;
    return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3">
            {selectedConvId && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedConvId(null)} className="md:hidden">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <MessageCircle className="h-7 w-7 text-[#1C7BB1]" />
            <h1 className="text-3xl font-bold text-[#0A4A6E]">
              {language === "es" ? "Mensajes" : "Messages"}
            </h1>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ minHeight: "calc(100vh - 240px)" }}>
          {/* Conversation List */}
          <div className={`md:col-span-1 ${selectedConvId ? "hidden md:block" : ""}`}>
            <Card className="border-0 shadow-lg h-full">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]" />
                  </div>
                ) : !conversations || conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="mx-auto h-12 w-12 text-[#1C7BB1]/30 mb-4" />
                    <p className="text-[#0A4A6E]/50 text-sm">
                      {language === "es" ? "Sin conversaciones aun" : "No conversations yet"}
                    </p>
                    <p className="text-[#0A4A6E]/30 text-xs mt-1">
                      {language === "es"
                        ? "Envia un mensaje desde el perfil de un tutor"
                        : "Send a message from a tutor's profile"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {conversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConvId(conv.id)}
                        className={`w-full p-4 text-left hover:bg-[#EAF4FA]/50 transition-colors ${
                          selectedConvId === conv.id ? "bg-[#EAF4FA]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0">
                            {conv.participant.avatar ? (
                              <img src={conv.participant.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <UserCircle className="h-6 w-6 text-[#1C7BB1]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-[#0A4A6E] truncate">{conv.participant.name}</h4>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {conv.lastMessageAt && (
                                  <span className="text-[10px] text-[#0A4A6E]/40">{formatRelativeTime(conv.lastMessageAt)}</span>
                                )}
                                {conv.unreadCount > 0 && (
                                  <Badge className="bg-[#1C7BB1] text-white text-[10px] h-5 min-w-5 flex items-center justify-center">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {conv.lastMessage && (
                              <p className="text-xs text-[#0A4A6E]/50 truncate mt-0.5">
                                {conv.lastMessage.senderId === user.id ? (language === "es" ? "Tu: " : "You: ") : ""}
                                {conv.lastMessage.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className={`md:col-span-2 ${!selectedConvId ? "hidden md:flex" : "flex"} flex-col`}>
            <Card className="border-0 shadow-lg flex-1 flex flex-col">
              {!selectedConvId ? (
                <CardContent className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <MessageCircle className="mx-auto h-16 w-16 text-[#1C7BB1]/20 mb-4" />
                    <p className="text-[#0A4A6E]/40">
                      {language === "es" ? "Selecciona una conversacion" : "Select a conversation"}
                    </p>
                  </div>
                </CardContent>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center">
                      {selectedConv?.participant.avatar ? (
                        <img src={selectedConv.participant.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserCircle className="h-5 w-5 text-[#1C7BB1]" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0A4A6E] text-sm">{selectedConv?.participant.name}</h3>
                      <p className="text-[10px] text-[#0A4A6E]/50">
                        {selectedConv?.participant.userType === "tutor"
                          ? (language === "es" ? "Tutor" : "Tutor")
                          : (language === "es" ? "Estudiante" : "Student")}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(100vh - 380px)" }}>
                    {messages?.map(msg => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? "bg-[#1C7BB1] text-white rounded-br-md"
                              : "bg-gray-100 text-[#0A4A6E] rounded-bl-md"
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <span className={`text-[10px] mt-1 block ${isMe ? "text-white/60" : "text-gray-400"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString(language === "es" ? "es-ES" : "en-US", {
                                hour: "numeric", minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <Textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={language === "es" ? "Escribe un mensaje..." : "Type a message..."}
                        rows={1}
                        className="flex-1 resize-none"
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (newMessage.trim()) sendMutation.mutate(newMessage);
                          }
                        }}
                      />
                      <Button
                        onClick={() => { if (newMessage.trim()) sendMutation.mutate(newMessage); }}
                        disabled={!newMessage.trim() || sendMutation.isPending}
                        className="bg-[#1C7BB1] hover:bg-[#0A4A6E] self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
