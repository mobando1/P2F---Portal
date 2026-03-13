import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { isAuthenticated } from "@/lib/auth";
import { BookOpen, LifeBuoy, HelpCircle, X } from "lucide-react";

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { language } = useLanguage();

  if (!isAuthenticated()) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-16 right-0 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => { setLocation("/guide"); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[#EAF4FA] transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-[#1C7BB1]/10">
                <BookOpen className="h-4 w-4 text-[#1C7BB1]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0A4A6E]">
                  {language === "es" ? "Centro de Ayuda" : "Help Center"}
                </p>
                <p className="text-[10px] text-[#0A4A6E]/50">
                  {language === "es" ? "Guias y tutoriales" : "Guides & tutorials"}
                </p>
              </div>
            </button>
            <div className="border-t border-gray-100" />
            <button
              onClick={() => { setLocation("/support"); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[#EAF4FA] transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-[#F59E1C]/10">
                <LifeBuoy className="h-4 w-4 text-[#F59E1C]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0A4A6E]">
                  {language === "es" ? "Contactanos" : "Contact Us"}
                </p>
                <p className="text-[10px] text-[#0A4A6E]/50">
                  {language === "es" ? "Soporte y tickets" : "Support & tickets"}
                </p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          open
            ? "bg-[#0A4A6E] text-white"
            : "bg-[#1C7BB1] text-white hover:bg-[#0A4A6E]"
        }`}
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </motion.button>
    </div>
  );
}
