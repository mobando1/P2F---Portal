import { Link } from "wouter";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { getCurrentUser } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import Header from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users, BookOpen, Search, Calendar, Star, Sparkles, ArrowRight } from "lucide-react";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

const categories = [
  {
    classType: "adults",
    language: "spanish",
    icon: GraduationCap,
    gradient: "from-[#1C7BB1] to-[#0A4A6E]",
    accentColor: "#1C7BB1",
    labelEs: "Espanol para Adultos",
    labelEn: "Spanish for Adults",
    badgeLabelEs: "Espanol",
    badgeLabelEn: "Spanish",
    descEs: "Clases personalizadas para profesionales y adultos que quieren dominar el espanol",
    descEn: "Personalized classes for professionals and adults who want to master Spanish",
  },
  {
    classType: "kids",
    language: "spanish",
    icon: Users,
    gradient: "from-[#F59E1C] to-[#e08a0e]",
    accentColor: "#F59E1C",
    labelEs: "Espanol para Ninos",
    labelEn: "Spanish for Kids",
    badgeLabelEs: "Espanol",
    badgeLabelEn: "Spanish",
    descEs: "Clases divertidas e interactivas disenadas especialmente para ninos y jovenes",
    descEn: "Fun, interactive classes designed especially for children and teens",
  },
  {
    classType: "adults",
    language: "english",
    icon: BookOpen,
    gradient: "from-[#0A4A6E] to-[#1C7BB1]",
    accentColor: "#0A4A6E",
    labelEs: "Ingles para Adultos",
    labelEn: "English for Adults",
    badgeLabelEs: "Ingles",
    badgeLabelEn: "English",
    descEs: "Mejora tu ingles con profesores nativos y metodos probados",
    descEn: "Improve your English with native speakers and proven methods",
  },
  {
    classType: "kids",
    language: "english",
    icon: Star,
    gradient: "from-[#1C7BB1] to-[#F59E1C]",
    accentColor: "#F59E1C",
    labelEs: "Ingles para Ninos",
    labelEn: "English for Kids",
    badgeLabelEs: "Ingles",
    badgeLabelEn: "English",
    descEs: "Aprende ingles de forma natural con juegos y actividades creativas",
    descEn: "Learn English naturally through games and creative activities",
  },
];

const steps = [
  {
    icon: Search,
    labelEs: "Elige un Profesor",
    labelEn: "Choose a Tutor",
    descEs: "Explora nuestros profesores certificados y elige el ideal para ti",
    descEn: "Browse our certified tutors and pick the perfect one for you",
  },
  {
    icon: Calendar,
    labelEs: "Reserva tu Clase Gratis",
    labelEn: "Book Your Free Class",
    descEs: "Tu primera clase de 50 minutos es completamente gratis, sin compromiso",
    descEn: "Your first 50-minute class is completely free, no strings attached",
  },
  {
    icon: GraduationCap,
    labelEs: "Comienza a Aprender",
    labelEn: "Start Learning",
    descEs: "Elige un plan o paquete de clases y alcanza la fluidez que deseas",
    descEn: "Pick a plan or class package and reach the fluency you want",
  },
];

export default function HomePage() {
  const user = getCurrentUser();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [stepsRef, stepsInView] = useInView({ triggerOnce: true, threshold: 0.2 });
  const [ctaRef, ctaInView] = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge className="bg-[#F59E1C]/10 text-[#F59E1C] border-0 px-4 py-1.5 text-sm font-semibold mb-4 inline-flex">
            {isEs ? "Tu primera clase es GRATIS" : "Your first class is FREE"}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0A4A6E] mb-4">
            {isEs
              ? `${user?.firstName ? `Hola, ${user.firstName}!` : "Bienvenido!"} Elige tu camino`
              : `${user?.firstName ? `Hi, ${user.firstName}!` : "Welcome!"} Choose your path`}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
            {isEs
              ? "Selecciona una categoria y encuentra al profesor perfecto para ti."
              : "Select a category and find your perfect tutor."}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-[#F59E1C] text-[#F59E1C]" />
              <span className="font-semibold text-[#0A4A6E]">4.9</span>
            </div>
            <span>·</span>
            <span>{isEs ? "500+ clases completadas" : "500+ classes completed"}</span>
            <span>·</span>
            <span>{isEs ? "Profesores certificados" : "Certified tutors"}</span>
          </div>
        </motion.div>

        {/* Category Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-6xl mx-auto"
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <motion.div key={`${cat.classType}-${cat.language}`} variants={fadeInUp}>
                <Link href={`/tutors?classType=${cat.classType}&language=${cat.language}`}>
                  <motion.div
                    whileHover={{ y: -6, boxShadow: "0 20px 50px rgba(10, 74, 110, 0.12)" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="group"
                  >
                    <Card className="cursor-pointer overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
                      {/* Gradient header */}
                      <div className={`bg-gradient-to-br ${cat.gradient} h-36 relative overflow-hidden flex items-center justify-center`}>
                        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/15 rounded-full blur-2xl" />
                        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                        <div className="relative w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      {/* Content */}
                      <CardContent className="p-5">
                        <Badge
                          className="border-0 mb-3 text-xs font-semibold"
                          style={{
                            backgroundColor: `${cat.accentColor}15`,
                            color: cat.accentColor,
                          }}
                        >
                          {isEs ? cat.badgeLabelEs : cat.badgeLabelEn}
                        </Badge>
                        <h3 className="text-base font-bold text-[#0A4A6E] mb-2 leading-tight">
                          {isEs ? cat.labelEs : cat.labelEn}
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">
                          {isEs ? cat.descEs : cat.descEn}
                        </p>
                        <Button
                          className="w-full text-white text-sm"
                          style={{ backgroundColor: cat.accentColor }}
                        >
                          {isEs ? "Ver Profesores" : "Browse Tutors"}
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* AI Practice Partner CTA */}
        <motion.div
          ref={ctaRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={ctaInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-4xl mx-auto"
        >
          <Link href="/ai-practice">
            <motion.div
              whileHover={{ y: -3, boxShadow: "0 16px 48px rgba(245, 158, 28, 0.2)" }}
              className="bg-gradient-to-r from-[#0A4A6E] via-[#1C7BB1] to-[#0A4A6E] rounded-2xl p-8 text-white cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E1C]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-8 h-8 text-[#F59E1C]" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold mb-1">
                    {isEs ? "Practice Partner IA" : "AI Practice Partner"}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {isEs
                      ? "Practica conversacion, pronunciacion y gramatica con tu companero de IA 24/7. Complementa tus clases con profesores reales."
                      : "Practice conversation, pronunciation, and grammar with your 24/7 AI buddy. Complement your classes with real tutors."}
                  </p>
                </div>
                <Button className="bg-[#F59E1C] hover:bg-[#e08a0e] text-white flex-shrink-0">
                  {isEs ? "Probar Gratis" : "Try Free"} →
                </Button>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* How It Works */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0A4A6E] mb-2">
            {isEs ? "Como Funciona" : "How It Works"}
          </h2>
          <p className="text-gray-500">
            {isEs ? "3 pasos simples para comenzar" : "3 simple steps to get started"}
          </p>
        </div>

        <motion.div
          ref={stepsRef}
          variants={staggerContainer}
          initial="hidden"
          animate={stepsInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12"
        >
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={i} variants={scaleIn} className="text-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center"
                >
                  <Icon className="w-8 h-8 text-[#1C7BB1]" />
                </motion.div>
                <div className="text-sm font-semibold text-[#F59E1C] mb-1">
                  {isEs ? `Paso ${i + 1}` : `Step ${i + 1}`}
                </div>
                <h3 className="text-lg font-bold text-[#0A4A6E] mb-2">
                  {isEs ? step.labelEs : step.labelEn}
                </h3>
                <p className="text-gray-500 text-sm">
                  {isEs ? step.descEs : step.descEn}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </main>
    </div>
  );
}
