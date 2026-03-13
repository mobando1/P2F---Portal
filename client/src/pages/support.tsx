import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import {
  LifeBuoy,
  Plus,
  ArrowLeft,
  Send,
  MessageCircle,
  Clock,
  CheckCircle,
} from "lucide-react";

interface Ticket {
  id: number;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketDetail extends Ticket {
  userName: string;
  messages: Array<{
    id: number;
    userId: number;
    message: string;
    isAdmin: boolean;
    userName: string;
    createdAt: string;
  }>;
}

const CATEGORIES = [
  { value: "technical", labelEs: "Problema Técnico", labelEn: "Technical Issue" },
  { value: "help", labelEs: "Ayuda General", labelEn: "General Help" },
  { value: "complaint", labelEs: "Queja", labelEn: "Complaint" },
  { value: "compliment", labelEs: "Felicitación", labelEn: "Compliment" },
  { value: "other", labelEs: "Otro", labelEn: "Other" },
];

export default function SupportPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const { language } = useLanguage();

  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [newTicket, setNewTicket] = useState({ subject: "", category: "help", message: "" });
  const [replyMessage, setReplyMessage] = useState("");

  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/support/tickets"],
    queryFn: () => apiRequest("GET", "/api/support/tickets").then(r => r.json()),
    enabled: view === "list",
  });

  const { data: ticketDetail, isLoading: isDetailLoading } = useQuery<TicketDetail>({
    queryKey: ["/api/support/tickets", selectedTicketId],
    queryFn: () => apiRequest("GET", `/api/support/tickets/${selectedTicketId}`).then(r => r.json()),
    enabled: view === "detail" && selectedTicketId !== null,
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: typeof newTicket) =>
      apiRequest("POST", "/api/support/tickets", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setNewTicket({ subject: "", category: "help", message: "" });
      setView("list");
      toast({
        title: language === "es" ? "Ticket creado" : "Ticket created",
        description: language === "es" ? "Tu solicitud ha sido enviada." : "Your request has been submitted.",
      });
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  });

  const replyMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", `/api/support/tickets/${selectedTicketId}/messages`, { message }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicketId] });
      setReplyMessage("");
    },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      open: { label: language === "es" ? "Abierto" : "Open", variant: "default" },
      in_progress: { label: language === "es" ? "En Progreso" : "In Progress", variant: "secondary" },
      resolved: { label: language === "es" ? "Resuelto" : "Resolved", variant: "outline" },
      closed: { label: language === "es" ? "Cerrado" : "Closed", variant: "destructive" },
    };
    const s = map[status] || map.open;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {view !== "list" && (
              <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedTicketId(null); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <LifeBuoy className="h-7 w-7 text-[#1C7BB1]" />
            <h1 className="text-3xl font-bold text-[#0A4A6E]">
              {language === "es" ? "Soporte" : "Support"}
            </h1>
          </div>
          <p className="text-[#0A4A6E]/70">
            {language === "es"
              ? "Envía un ticket para problemas técnicos, quejas, o ayuda general."
              : "Submit a ticket for technical issues, complaints, or general help."}
          </p>
        </motion.div>

        {/* List View */}
        {view === "list" && (
          <div className="space-y-4">
            <Button onClick={() => setView("new")} className="bg-[#1C7BB1] hover:bg-[#0A4A6E]">
              <Plus className="h-4 w-4 mr-2" />
              {language === "es" ? "Nuevo Ticket" : "New Ticket"}
            </Button>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]" />
              </div>
            ) : tickets && tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow"
                    onClick={() => { setSelectedTicketId(ticket.id); setView("detail"); }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageCircle className="h-4 w-4 text-[#1C7BB1]" />
                            <h3 className="font-semibold text-[#0A4A6E]">{ticket.subject}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>#{ticket.id}</span>
                            <Badge variant="outline" className="text-xs">{
                              CATEGORIES.find(c => c.value === ticket.category)?.[language === "es" ? "labelEs" : "labelEn"] || ticket.category
                            }</Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(ticket.createdAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                        {statusBadge(ticket.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow">
                <CardContent className="p-12 text-center">
                  <LifeBuoy className="mx-auto h-12 w-12 text-[#1C7BB1]/30 mb-4" />
                  <p className="text-[#0A4A6E]/50">
                    {language === "es" ? "No tienes tickets de soporte" : "No support tickets yet"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* New Ticket View */}
        {view === "new" && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-[#0A4A6E]">
                {language === "es" ? "Nuevo Ticket" : "New Ticket"}
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "es" ? "Asunto" : "Subject"}
                </label>
                <Input
                  value={newTicket.subject}
                  onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder={language === "es" ? "Describe brevemente tu problema" : "Briefly describe your issue"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "es" ? "Categoría" : "Category"}
                </label>
                <select
                  value={newTicket.category}
                  onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>
                      {language === "es" ? c.labelEs : c.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "es" ? "Mensaje" : "Message"}
                </label>
                <Textarea
                  value={newTicket.message}
                  onChange={e => setNewTicket({ ...newTicket, message: e.target.value })}
                  rows={5}
                  placeholder={language === "es" ? "Describe tu problema o solicitud en detalle..." : "Describe your issue in detail..."}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => createTicketMutation.mutate(newTicket)}
                  disabled={!newTicket.subject || !newTicket.message || createTicketMutation.isPending}
                  className="bg-[#1C7BB1] hover:bg-[#0A4A6E]"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {createTicketMutation.isPending
                    ? (language === "es" ? "Enviando..." : "Sending...")
                    : (language === "es" ? "Enviar Ticket" : "Submit Ticket")}
                </Button>
                <Button variant="outline" onClick={() => setView("list")}>
                  {language === "es" ? "Cancelar" : "Cancel"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detail View */}
        {view === "detail" && (
          <div className="space-y-4">
            {isDetailLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]" />
              </div>
            ) : ticketDetail ? (
              <>
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-[#0A4A6E]">{ticketDetail.subject}</h2>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>#{ticketDetail.id}</span>
                          <Badge variant="outline">{
                            CATEGORIES.find(c => c.value === ticketDetail.category)?.[language === "es" ? "labelEs" : "labelEn"] || ticketDetail.category
                          }</Badge>
                        </div>
                      </div>
                      {statusBadge(ticketDetail.status)}
                    </div>

                    {/* Messages */}
                    <div className="space-y-4 mt-6">
                      {ticketDetail.messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.isAdmin ? "justify-start" : "justify-end"}`}
                        >
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            msg.isAdmin
                              ? "bg-[#EAF4FA] text-[#0A4A6E]"
                              : "bg-[#1C7BB1] text-white"
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold ${msg.isAdmin ? "text-[#1C7BB1]" : "text-white/80"}`}>
                                {msg.isAdmin ? (language === "es" ? "Soporte" : "Support") : msg.userName}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <span className={`text-[10px] mt-1 block ${msg.isAdmin ? "text-gray-400" : "text-white/60"}`}>
                              {new Date(msg.createdAt).toLocaleString(language === "es" ? "es-ES" : "en-US", {
                                day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply */}
                    {ticketDetail.status !== "closed" && (
                      <div className="flex gap-2 mt-6">
                        <Textarea
                          value={replyMessage}
                          onChange={e => setReplyMessage(e.target.value)}
                          rows={2}
                          placeholder={language === "es" ? "Escribe tu respuesta..." : "Write your reply..."}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => replyMutation.mutate(replyMessage)}
                          disabled={!replyMessage.trim() || replyMutation.isPending}
                          className="bg-[#1C7BB1] hover:bg-[#0A4A6E] self-end"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {ticketDetail.status === "resolved" && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        {language === "es" ? "Este ticket ha sido resuelto" : "This ticket has been resolved"}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
