import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { isAuthenticated } from "@/lib/auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  MessageCircle, BookOpen, LifeBuoy, Search, ChevronDown, ChevronUp,
  Lightbulb, ExternalLink,
} from "lucide-react";

// ── Per-page contextual tips ──────────────────────────────────────────────────

const PAGE_HELP: Record<string, { title: string; titleEs: string; tips: string[]; tipsEs: string[] }> = {
  "/home": {
    title: "Getting Started",
    titleEs: "Comenzar",
    tips: [
      "Choose your learning category (Adults or Kids, Spanish or English).",
      "After selecting a category, you'll browse available tutors.",
      "You have 1 free trial class — no credit card needed.",
    ],
    tipsEs: [
      "Elige tu categoría de aprendizaje (Adultos o Niños, Español o Inglés).",
      "Después de elegir la categoría podrás ver los tutores disponibles.",
      "Tienes 1 clase de prueba gratis — sin tarjeta de crédito.",
    ],
  },
  "/dashboard": {
    title: "Your Dashboard",
    titleEs: "Tu Panel",
    tips: [
      "See all your upcoming classes and join them directly from here.",
      "Track your progress: classes completed, learning hours, and current streak.",
      "The AI Practice card shows how many free messages you have left today.",
    ],
    tipsEs: [
      "Aquí ves todas tus clases próximas y puedes unirte directamente.",
      "Sigue tu progreso: clases completadas, horas de aprendizaje y racha actual.",
      "La tarjeta de IA muestra cuántos mensajes gratis te quedan hoy.",
    ],
  },
  "/tutors": {
    title: "Finding a Tutor",
    titleEs: "Buscar Tutor",
    tips: [
      "Filter by specialty (Conversational, Business, Kids, etc.) and language.",
      "Click a tutor card to see their full profile, reviews, and availability.",
      "To book, select a date & time that matches the tutor's open slots.",
    ],
    tipsEs: [
      "Filtra por especialidad (Conversación, Negocios, Niños, etc.) e idioma.",
      "Haz clic en un tutor para ver su perfil completo, reseñas y disponibilidad.",
      "Para reservar, selecciona una fecha y hora dentro de los turnos disponibles del tutor.",
    ],
  },
  "/learning-path": {
    title: "Your Learning Path",
    titleEs: "Mi Camino",
    tips: [
      "Each circle (station) contains lessons, quizzes, and practice exercises.",
      "Complete all quizzes in a station (≥70%) to unlock the next one.",
      "Your tutor can assign specific stations for you to work on.",
    ],
    tipsEs: [
      "Cada círculo (estación) contiene lecciones, quizzes y ejercicios de práctica.",
      "Completa todos los quizzes de una estación (≥70%) para desbloquear la siguiente.",
      "Tu tutor puede asignarte estaciones específicas para trabajar.",
    ],
  },
  "/ai-practice": {
    title: "AI Practice Partner",
    titleEs: "Práctica con IA",
    tips: [
      "Chat in Spanish (or your target language) to practice naturally.",
      "The AI corrects your grammar and explains mistakes in real time.",
      "Free users get 20 messages/day. Subscribe for unlimited access.",
    ],
    tipsEs: [
      "Escribe en español (o tu idioma objetivo) para practicar de forma natural.",
      "La IA corrige tu gramática y explica los errores en tiempo real.",
      "Usuarios gratuitos tienen 20 mensajes/día. Suscríbete para acceso ilimitado.",
    ],
  },
  "/tutor-portal": {
    title: "Tutor Portal",
    titleEs: "Portal del Tutor",
    tips: [
      "Set your weekly availability so students can book you.",
      "Mark classes as complete after they finish to track earnings.",
      "Use the Students tab to see your active students' progress.",
    ],
    tipsEs: [
      "Define tu disponibilidad semanal para que los alumnos puedan reservarte.",
      "Marca las clases como completadas para registrar tus ingresos.",
      "Usa la pestaña Alumnos para ver el progreso de tus estudiantes activos.",
    ],
  },
  "/packages": {
    title: "Class Packages",
    titleEs: "Paquetes de Clases",
    tips: [
      "Buy class packs that never expire — use them at your own pace.",
      "Subscription plans auto-renew and give you classes every month.",
      "Discount codes can be applied at checkout.",
    ],
    tipsEs: [
      "Compra paquetes de clases que nunca vencen — úsalos a tu ritmo.",
      "Los planes de suscripción se renuevan automáticamente cada mes.",
      "Los códigos de descuento se aplican en el proceso de pago.",
    ],
  },
  "/messages": {
    title: "Messages",
    titleEs: "Mensajes",
    tips: [
      "Message your tutor directly before or after a class.",
      "Share notes, homework, or ask questions between sessions.",
    ],
    tipsEs: [
      "Escríbele directamente a tu tutor antes o después de la clase.",
      "Comparte notas, tareas o haz preguntas entre sesiones.",
    ],
  },
  "/profile": {
    title: "Your Profile",
    titleEs: "Tu Perfil",
    tips: [
      "Add a profile photo and bio so tutors know who you are.",
      "Set your timezone to make scheduling easier.",
    ],
    tipsEs: [
      "Agrega una foto y biografía para que los tutores sepan quién eres.",
      "Configura tu zona horaria para facilitar la programación.",
    ],
  },
  "/support": {
    title: "Support",
    titleEs: "Soporte",
    tips: [
      "Open a ticket and our team will respond within 24 hours.",
      "Check existing tickets to see updates on your requests.",
    ],
    tipsEs: [
      "Abre un ticket y nuestro equipo responde en menos de 24 horas.",
      "Revisa tus tickets existentes para ver actualizaciones.",
    ],
  },
};

// ── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "How do I book my free trial class?",
    a: "Go to Tutors, pick a tutor you like, select an available time slot, and click Book. Your first class is free — no payment needed.",
    qEs: "¿Cómo reservo mi clase de prueba gratis?",
    aEs: "Ve a Tutores, elige un tutor, selecciona un horario disponible y haz clic en Reservar. Tu primera clase es gratis, sin pago.",
  },
  {
    q: "How do I join my class?",
    a: "From your Dashboard, find the upcoming class and click Join. The Google Meet link also appears in your confirmation email.",
    qEs: "¿Cómo entro a mi clase?",
    aEs: "Desde tu Panel, encuentra la clase próxima y haz clic en Unirse. El enlace de Google Meet también está en tu correo de confirmación.",
  },
  {
    q: "Can I reschedule a class?",
    a: "Yes — click the class in your Dashboard, then use the Reschedule option. Contact your tutor in Messages if you need flexibility.",
    qEs: "¿Puedo reprogramar una clase?",
    aEs: "Sí — haz clic en la clase en tu Panel y usa la opción Reprogramar. Escríbele a tu tutor en Mensajes si necesitas más flexibilidad.",
  },
  {
    q: "What happens to my credits if I cancel?",
    a: "Credits are refunded automatically if you cancel more than 24 hours before the class.",
    qEs: "¿Qué pasa con mis créditos si cancelo?",
    aEs: "Los créditos se reembolsan automáticamente si cancelas más de 24 horas antes de la clase.",
  },
  {
    q: "How does the AI Practice Partner work?",
    a: "Open the AI Practice page and start chatting in your target language. The AI acts as a conversation partner, corrects errors, and explains grammar.",
    qEs: "¿Cómo funciona el Compañero de Práctica IA?",
    aEs: "Abre la página de Práctica IA y empieza a escribir en tu idioma objetivo. La IA actúa como compañero de conversación, corrige errores y explica gramática.",
  },
  {
    q: "How do I track my progress?",
    a: "Your Dashboard shows stats like classes completed and learning hours. The Learning Path shows your level progression through stations.",
    qEs: "¿Cómo sigo mi progreso?",
    aEs: "Tu Panel muestra estadísticas como clases completadas y horas de aprendizaje. Mi Camino muestra tu progresión de nivel a través de las estaciones.",
  },
  {
    q: "Do class packages expire?",
    a: "No, class packs never expire. Use them at your own pace.",
    qEs: "¿Vencen los paquetes de clases?",
    aEs: "No, los paquetes de clases no vencen. Úsalos a tu propio ritmo.",
  },
  {
    q: "How do I set my availability as a tutor?",
    a: "Go to Tutor Portal → Availability. Set your weekly recurring slots and add exceptions for days off.",
    qEs: "¿Cómo configuro mi disponibilidad como tutor?",
    aEs: "Ve a Portal del Tutor → Disponibilidad. Configura tus turnos semanales recurrentes y agrega excepciones para días libres.",
  },
  {
    q: "Can I message my tutor?",
    a: "Yes — use the Messages section to chat directly with your tutor between classes.",
    qEs: "¿Puedo escribirle a mi tutor?",
    aEs: "Sí — usa la sección de Mensajes para chatear directamente con tu tutor entre clases.",
  },
  {
    q: "How do I change my password?",
    a: "Go to Settings → Security and use the Change Password form.",
    qEs: "¿Cómo cambio mi contraseña?",
    aEs: "Ve a Configuración → Seguridad y usa el formulario de Cambiar Contraseña.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { language } = useLanguage();
  const es = language === "es";

  const isAuthed = isAuthenticated();

  // Find the best matching page help (strip query strings, try prefix match)
  const basePath = location.split("?")[0];
  const pageHelp =
    PAGE_HELP[basePath] ??
    Object.entries(PAGE_HELP).find(([key]) => basePath.startsWith(key))?.[1];

  const filteredFaq = useMemo(() => {
    if (!search.trim()) return FAQ;
    const term = search.toLowerCase();
    return FAQ.filter(
      (f) =>
        (es ? f.qEs : f.q).toLowerCase().includes(term) ||
        (es ? f.aEs : f.a).toLowerCase().includes(term)
    );
  }, [search, es]);

  if (!isAuthed) return null;

  const handleOpen = () => {
    setOpen(true);
    try { localStorage.setItem("p2f_help_seen", "1"); } catch {}
  };

  const helpSeen = (() => { try { return !!localStorage.getItem("p2f_help_seen"); } catch { return true; } })();

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpen}
          className="relative w-13 h-13 w-[52px] h-[52px] rounded-full shadow-xl flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
          aria-label="Help"
        >
          <MessageCircle className="h-5 w-5" />
          {/* Pulsing badge for first-time visitors */}
          {!helpSeen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-accent items-center justify-center text-[9px] font-bold text-white">!</span>
            </span>
          )}
        </motion.button>
      </div>

      {/* Help Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[400px] p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-4 bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] text-white flex-shrink-0">
            <SheetTitle className="text-white flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              {es ? "Centro de Ayuda" : "Help Center"}
            </SheetTitle>
            <p className="text-blue-100 text-xs mt-0.5">
              {es ? "Encuentra respuestas rápidas o contacta soporte" : "Find quick answers or contact support"}
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Contextual page tips */}
            {pageHelp && (
              <div className="mx-4 mt-4 rounded-xl bg-primary/10 border border-blue-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {es ? `Ayuda: ${pageHelp.titleEs}` : `Tips: ${pageHelp.title}`}
                  </span>
                </div>
                <ul className="space-y-2">
                  {(es ? pageHelp.tipsEs : pageHelp.tips).map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FAQ */}
            <div className="px-4 mt-4">
              <p className="text-xs font-semibold text-foreground/60 mb-2">
                {es ? "Preguntas Frecuentes" : "Frequently Asked Questions"}
              </p>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setExpandedFaq(null); }}
                  placeholder={es ? "Buscar…" : "Search…"}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-muted/40"
                />
              </div>

              {/* FAQ items */}
              <div className="space-y-1.5 pb-4">
                {filteredFaq.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {es ? "Sin resultados. Prueba con otra búsqueda." : "No results. Try a different search."}
                  </p>
                )}
                {filteredFaq.map((item, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    >
                      <span className="text-xs font-medium text-foreground leading-snug">
                        {es ? item.qEs : item.q}
                      </span>
                      {expandedFaq === i
                        ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      }
                    </button>
                    {expandedFaq === i && (
                      <div className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
                        {es ? item.aEs : item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer links */}
          <div className="flex-shrink-0 border-t border-border p-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => { setLocation("/guide"); setOpen(false); }}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/8 hover:bg-primary/15 text-primary text-xs font-medium transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {es ? "Guía completa" : "Full Guide"}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </button>
            <button
              onClick={() => { setLocation("/support"); setOpen(false); }}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent/8 hover:bg-accent/15 text-accent text-xs font-medium transition-colors"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              {es ? "Soporte" : "Support"}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
