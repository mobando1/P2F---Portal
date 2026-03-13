import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLocation } from "wouter";
import Header from "@/components/header";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  Rocket,
  Calendar,
  Video,
  CreditCard,
  Trophy,
  Sparkles,
  LifeBuoy,
  LayoutDashboard,
  Clock,
  Users,
  DollarSign,
  UserCircle,
  BookOpen,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface GuideSection {
  icon: React.ElementType;
  titleEs: string;
  titleEn: string;
  steps: Array<{ es: string; en: string }>;
  tipEs?: string;
  tipEn?: string;
}

const STUDENT_SECTIONS: GuideSection[] = [
  {
    icon: Rocket,
    titleEs: "Como Empezar",
    titleEn: "Getting Started",
    steps: [
      {
        es: "Crea tu cuenta con tu correo electronico e inicia sesion en la plataforma.",
        en: "Create your account with your email and log in to the platform.",
      },
      {
        es: "Navega a la seccion de Planes para elegir un paquete de creditos (Starter, Plus o Premium). Cada credito equivale a una clase.",
        en: "Go to the Plans section to choose a credit package (Starter, Plus, or Premium). Each credit equals one class.",
      },
      {
        es: "Explora los perfiles de nuestros tutores en la seccion Tutores. Puedes ver su experiencia, idiomas, calificaciones y resenas de otros estudiantes.",
        en: "Browse our tutors' profiles in the Tutors section. You can see their experience, languages, ratings, and reviews from other students.",
      },
    ],
    tipEs: "Puedes tomar una clase de prueba gratuita con cualquier tutor antes de comprar un paquete.",
    tipEn: "You can take a free trial class with any tutor before purchasing a package.",
  },
  {
    icon: Calendar,
    titleEs: "Reservar Clases",
    titleEn: "Booking Classes",
    steps: [
      {
        es: "Entra al perfil de un tutor y haz clic en 'Reservar Clase'. Veras su calendario de disponibilidad con los horarios abiertos.",
        en: "Go to a tutor's profile and click 'Book Class'. You'll see their availability calendar with open time slots.",
      },
      {
        es: "Selecciona el dia y horario que prefieras. Los horarios disponibles se muestran en verde.",
        en: "Select your preferred day and time. Available slots are shown in green.",
      },
      {
        es: "Confirma tu reserva. Se descontara 1 credito de tu cuenta automaticamente.",
        en: "Confirm your booking. 1 credit will be automatically deducted from your account.",
      },
      {
        es: "Para clases recurrentes, puedes programar clases semanales con el mismo tutor en el mismo horario.",
        en: "For recurring classes, you can schedule weekly classes with the same tutor at the same time.",
      },
    ],
    tipEs: "Las clases de prueba no consumen creditos. Son ideales para conocer a un tutor antes de comprometerte.",
    tipEn: "Trial classes don't use credits. They're ideal for getting to know a tutor before committing.",
  },
  {
    icon: Video,
    titleEs: "Tus Clases",
    titleEn: "Your Classes",
    steps: [
      {
        es: "Todas tus clases programadas aparecen en tu Dashboard. Las clases del dia se destacan con un indicador especial.",
        en: "All your scheduled classes appear on your Dashboard. Today's classes are highlighted with a special indicator.",
      },
      {
        es: "Cuando sea hora de tu clase, haz clic en el boton 'Unirse' para entrar a la videollamada con tu tutor.",
        en: "When it's time for your class, click the 'Join' button to enter the video call with your tutor.",
      },
      {
        es: "Puedes reprogramar o cancelar una clase hasta 12 horas antes del horario programado. Si cancelas, tu credito sera devuelto.",
        en: "You can reschedule or cancel a class up to 12 hours before the scheduled time. If you cancel, your credit will be refunded.",
      },
      {
        es: "Despues de cada clase completada, podras ver tu historial y dejar una resena sobre tu experiencia.",
        en: "After each completed class, you can view your history and leave a review about your experience.",
      },
    ],
    tipEs: "El boton de videollamada se activa 30 minutos antes del inicio de la clase.",
    tipEn: "The video call button activates 30 minutes before class starts.",
  },
  {
    icon: CreditCard,
    titleEs: "Creditos y Pagos",
    titleEn: "Credits & Payments",
    steps: [
      {
        es: "Los creditos son la moneda de la plataforma. 1 credito = 1 clase. Compra creditos en la seccion de Planes.",
        en: "Credits are the platform's currency. 1 credit = 1 class. Purchase credits in the Plans section.",
      },
      {
        es: "Paquetes disponibles: Starter (4 creditos), Plus (8 creditos), Premium (16 creditos). Los paquetes mas grandes tienen mejor precio por clase.",
        en: "Available packages: Starter (4 credits), Plus (8 credits), Premium (16 credits). Larger packages have better per-class pricing.",
      },
      {
        es: "Puedes ver tus creditos restantes en la parte superior de tu Dashboard.",
        en: "You can see your remaining credits at the top of your Dashboard.",
      },
      {
        es: "Al cancelar una clase (con mas de 12h de anticipacion), el credito se reembolsa automaticamente a tu cuenta.",
        en: "When canceling a class (with more than 12h notice), the credit is automatically refunded to your account.",
      },
    ],
  },
  {
    icon: Trophy,
    titleEs: "Logros y Progreso",
    titleEn: "Achievements & Progress",
    steps: [
      {
        es: "Gana logros al completar hitos: tu primera clase, 5 clases, 10, 20 y 50 clases completadas.",
        en: "Earn achievements by completing milestones: your first class, 5 classes, 10, 20, and 50 completed classes.",
      },
      {
        es: "Mantiene una racha de clases consecutivas para desbloquear logros especiales (3, 7, 14 y 30 dias).",
        en: "Maintain a streak of consecutive classes to unlock special achievements (3, 7, 14, and 30 days).",
      },
      {
        es: "Tu progreso se muestra en el Dashboard: horas de aprendizaje, clases completadas, y racha actual.",
        en: "Your progress is shown on the Dashboard: learning hours, completed classes, and current streak.",
      },
      {
        es: "Deja resenas a tus tutores despues de cada clase. Tambien ganaras un logro por tu primera resena.",
        en: "Leave reviews for your tutors after each class. You'll also earn an achievement for your first review.",
      },
    ],
  },
  {
    icon: Sparkles,
    titleEs: "Practicar con IA",
    titleEn: "AI Practice Partner",
    steps: [
      {
        es: "Accede al AI Practice Partner desde el menu principal o tu Dashboard para practicar entre clases.",
        en: "Access the AI Practice Partner from the main menu or your Dashboard to practice between classes.",
      },
      {
        es: "Elige el tema de conversacion y tu nivel de dificultad. El AI se adapta a tu nivel.",
        en: "Choose the conversation topic and your difficulty level. The AI adapts to your level.",
      },
      {
        es: "Practica conversacion, vocabulario o gramatica de forma interactiva sin limite de tiempo.",
        en: "Practice conversation, vocabulary, or grammar interactively with no time limit.",
      },
    ],
    tipEs: "El AI Practice Partner esta disponible 24/7 y es un complemento ideal a tus clases con tutores.",
    tipEn: "The AI Practice Partner is available 24/7 and is an ideal complement to your tutor classes.",
  },
  {
    icon: LifeBuoy,
    titleEs: "Soporte",
    titleEn: "Support",
    steps: [
      {
        es: "Si tienes problemas tecnicos, quejas o necesitas ayuda, ve a la seccion de Soporte y crea un nuevo ticket.",
        en: "If you have technical issues, complaints, or need help, go to the Support section and create a new ticket.",
      },
      {
        es: "Elige una categoria para tu ticket: Problema Tecnico, Ayuda General, Queja, Felicitacion u Otro.",
        en: "Choose a category for your ticket: Technical Issue, General Help, Complaint, Compliment, or Other.",
      },
      {
        es: "Nuestro equipo respondera tu ticket. Podras ver el estado (Abierto, En Progreso, Resuelto) y responder desde la misma conversacion.",
        en: "Our team will respond to your ticket. You can see the status (Open, In Progress, Resolved) and reply from the same conversation.",
      },
    ],
    tipEs: "Para reprogramar o cancelar clases, hazlo directamente desde tu Dashboard, no necesitas crear un ticket.",
    tipEn: "To reschedule or cancel classes, do it directly from your Dashboard — no need to create a ticket.",
  },
];

const TUTOR_SECTIONS: GuideSection[] = [
  {
    icon: LayoutDashboard,
    titleEs: "Tu Portal",
    titleEn: "Your Portal",
    steps: [
      {
        es: "Accede a tu portal desde el menu principal haciendo clic en 'Portal del Tutor'. Aqui gestionas todo tu trabajo.",
        en: "Access your portal from the main menu by clicking 'Tutor Portal'. Here you manage all your work.",
      },
      {
        es: "El Dashboard te muestra estadisticas rapidas: clases de hoy, programadas, completadas y horas totales.",
        en: "The Dashboard shows quick stats: today's classes, scheduled, completed, and total hours.",
      },
      {
        es: "En la seccion principal veras tus proximas clases con el nombre del estudiante, horario y boton para unirte a la videollamada.",
        en: "In the main section you'll see your upcoming classes with the student name, schedule, and button to join the video call.",
      },
    ],
  },
  {
    icon: Clock,
    titleEs: "Gestionar Disponibilidad",
    titleEn: "Manage Availability",
    steps: [
      {
        es: "Ve a 'Gestionar Disponibilidad' para configurar tus horarios semanales. Define los dias y horas en que estas disponible.",
        en: "Go to 'Manage Availability' to set your weekly schedule. Define the days and hours you're available.",
      },
      {
        es: "Puedes agregar excepciones para dias especificos: vacaciones, dias festivos o cualquier dia que necesites bloquear.",
        en: "You can add exceptions for specific dates: vacations, holidays, or any day you need to block.",
      },
      {
        es: "Los estudiantes solo veran como disponibles los horarios que hayas configurado. Asegurate de mantenerlos actualizados.",
        en: "Students will only see the time slots you've configured as available. Make sure to keep them updated.",
      },
    ],
    tipEs: "Puedes agregar una razon a cada excepcion para tu propia referencia (ej: 'Vacaciones de Semana Santa').",
    tipEn: "You can add a reason to each exception for your own reference (e.g., 'Easter vacation').",
  },
  {
    icon: Video,
    titleEs: "Tus Clases",
    titleEn: "Your Classes",
    steps: [
      {
        es: "Todas tus clases programadas aparecen en el Dashboard. Las que estan proximas se destacan con un indicador verde.",
        en: "All your scheduled classes appear on the Dashboard. Upcoming ones are highlighted with a green indicator.",
      },
      {
        es: "Cuando sea hora, haz clic en 'Unirse' para entrar a la videollamada con tu estudiante.",
        en: "When it's time, click 'Join' to enter the video call with your student.",
      },
      {
        es: "Despues de la clase, haz clic en 'Completar' para marcarla como finalizada. Esto actualiza las estadisticas del estudiante.",
        en: "After class, click 'Complete' to mark it as finished. This updates the student's statistics.",
      },
      {
        es: "Si un estudiante cancela con mas de 12h de anticipacion, la clase desaparece de tu calendario automaticamente.",
        en: "If a student cancels with more than 12h notice, the class automatically disappears from your calendar.",
      },
    ],
  },
  {
    icon: Users,
    titleEs: "Tus Estudiantes",
    titleEn: "Your Students",
    steps: [
      {
        es: "En la pestana 'Mis Estudiantes' veras una lista de todos los estudiantes que han tomado clases contigo.",
        en: "In the 'My Students' tab you'll see a list of all students who have taken classes with you.",
      },
      {
        es: "Para cada estudiante puedes ver: nombre, correo, total de clases, clases completadas y la fecha de su ultima clase.",
        en: "For each student you can see: name, email, total classes, completed classes, and their last class date.",
      },
      {
        es: "Usa esta informacion para preparar tus clases y hacer seguimiento del progreso de cada estudiante.",
        en: "Use this information to prepare your classes and track each student's progress.",
      },
    ],
  },
  {
    icon: DollarSign,
    titleEs: "Ganancias",
    titleEn: "Earnings",
    steps: [
      {
        es: "En la pestana 'Ganancias' veras un resumen de tus ingresos: total ganado, horas totales, tarifa por hora y clases completadas.",
        en: "In the 'Earnings' tab you'll see a summary of your income: total earned, total hours, hourly rate, and completed classes.",
      },
      {
        es: "El desglose mensual muestra tus ganancias de los ultimos 6 meses con una barra visual y el numero de clases por mes.",
        en: "The monthly breakdown shows your earnings from the last 6 months with a visual bar and the number of classes per month.",
      },
      {
        es: "Tus ganancias se calculan automaticamente: horas completadas multiplicadas por tu tarifa por hora.",
        en: "Your earnings are calculated automatically: completed hours multiplied by your hourly rate.",
      },
    ],
  },
  {
    icon: UserCircle,
    titleEs: "Tu Perfil",
    titleEn: "Your Profile",
    steps: [
      {
        es: "Actualiza tu perfil profesional desde el portal: biografia, telefono, idiomas que ensenas y certificaciones.",
        en: "Update your professional profile from the portal: bio, phone, languages you teach, and certifications.",
      },
      {
        es: "Los estudiantes pueden dejarte resenas despues de cada clase. Tu calificacion promedio y numero de resenas se muestran en tu perfil publico.",
        en: "Students can leave you reviews after each class. Your average rating and review count are shown on your public profile.",
      },
      {
        es: "Un perfil completo y bien escrito ayuda a atraer mas estudiantes. Incluye tu experiencia y metodo de ensenanza.",
        en: "A complete and well-written profile helps attract more students. Include your experience and teaching method.",
      },
    ],
    tipEs: "Responde a las resenas de tus estudiantes para mostrar que valoras su opinion.",
    tipEn: "Respond to your students' reviews to show you value their feedback.",
  },
];

function GuideCard({ section, index, language }: { section: GuideSection; index: number; language: string }) {
  const [expanded, setExpanded] = useState(index === 0);
  const Icon = section.icon;

  return (
    <motion.div variants={fadeInUp}>
      <Card
        className={`border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
          expanded ? "ring-1 ring-[#1C7BB1]/20" : ""
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#1C7BB1]/10">
                <Icon className="h-5 w-5 text-[#1C7BB1]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0A4A6E]">
                {language === "es" ? section.titleEs : section.titleEn}
              </h3>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-[#0A4A6E]/40" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[#0A4A6E]/40" />
            )}
          </div>

          {expanded && (
            <div className="px-5 pb-5 pt-0">
              <ol className="space-y-3">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F59E1C]/15 text-[#F59E1C] text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-[#0A4A6E]/80 leading-relaxed">
                      {language === "es" ? step.es : step.en}
                    </p>
                  </li>
                ))}
              </ol>

              {(section.tipEs || section.tipEn) && (
                <div className="mt-4 p-3 rounded-lg bg-[#EAF4FA] border border-[#1C7BB1]/10">
                  <p className="text-xs font-semibold text-[#1C7BB1] mb-1">
                    {language === "es" ? "Consejo" : "Tip"}
                  </p>
                  <p className="text-sm text-[#0A4A6E]/70">
                    {language === "es" ? section.tipEs : section.tipEn}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function GuidePage() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const user = getCurrentUser();
  const [activeTab, setActiveTab] = useState<"student" | "tutor">(
    user?.userType === "tutor" ? "tutor" : "student"
  );

  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  const sections = activeTab === "student" ? STUDENT_SECTIONS : TUTOR_SECTIONS;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-7 w-7 text-[#1C7BB1]" />
            <h1 className="text-3xl font-bold text-[#0A4A6E]">
              {language === "es" ? "Guia de Uso" : "User Guide"}
            </h1>
          </div>
          <p className="text-[#0A4A6E]/70">
            {language === "es"
              ? "Aprende como aprovechar al maximo la plataforma Passport2Fluency."
              : "Learn how to get the most out of the Passport2Fluency platform."}
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === "student" ? "default" : "outline"}
            className={activeTab === "student" ? "bg-[#1C7BB1] hover:bg-[#0A4A6E]" : "text-[#0A4A6E]"}
            onClick={() => setActiveTab("student")}
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            {language === "es" ? "Estudiantes" : "Students"}
          </Button>
          <Button
            variant={activeTab === "tutor" ? "default" : "outline"}
            className={activeTab === "tutor" ? "bg-[#1C7BB1] hover:bg-[#0A4A6E]" : "text-[#0A4A6E]"}
            onClick={() => setActiveTab("tutor")}
          >
            <Users className="h-4 w-4 mr-2" />
            {language === "es" ? "Tutores" : "Tutors"}
          </Button>
        </div>

        {/* Sections */}
        <motion.div
          key={activeTab}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {sections.map((section, i) => (
            <GuideCard key={`${activeTab}-${i}`} section={section} index={i} language={language} />
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E]">
            <CardContent className="p-8">
              <LifeBuoy className="h-8 w-8 text-white/80 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {language === "es" ? "Necesitas mas ayuda?" : "Need more help?"}
              </h3>
              <p className="text-white/70 text-sm mb-4">
                {language === "es"
                  ? "Nuestro equipo de soporte esta listo para ayudarte con cualquier pregunta."
                  : "Our support team is ready to help you with any questions."}
              </p>
              <Button
                variant="secondary"
                onClick={() => setLocation("/support")}
                className="bg-white text-[#0A4A6E] hover:bg-white/90"
              >
                <LifeBuoy className="h-4 w-4 mr-2" />
                {language === "es" ? "Contactar Soporte" : "Contact Support"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
