import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const { language } = useLanguage();
  const isEs = language === "es";

  return (
    <div className="min-h-screen bg-[#EAF4FA] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Animated 404 number */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 120 }}
          className="mb-6"
        >
          <span className="text-8xl md:text-9xl font-black bg-gradient-to-br from-[#1C7BB1] to-[#F59E1C] bg-clip-text text-transparent select-none">
            404
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-[#0A4A6E] mb-3"
        >
          {isEs ? "Página no encontrada" : "Page not found"}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[#0A4A6E]/60 mb-8"
        >
          {isEs
            ? "Parece que esta página se perdió en la traducción."
            : "Looks like this page got lost in translation."}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link href="/">
            <Button className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white">
              <Home className="mr-2 h-4 w-4" />
              {isEs ? "Ir al Inicio" : "Go Home"}
            </Button>
          </Link>
          <Button
            variant="outline"
            className="border-[#1C7BB1]/30 text-[#1C7BB1] hover:bg-[#1C7BB1]/5"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isEs ? "Volver Atrás" : "Go Back"}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
