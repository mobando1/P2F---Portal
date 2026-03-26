import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const isEs = language === "es";

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return res.json();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#EAF4FA] mb-4">
            <Mail size={28} className="text-[#1C7BB1]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0A4A6E]">
            {isEs ? "Recuperar contraseña" : "Reset password"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Passport2Fluency</p>
        </div>

        {mutation.isSuccess ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
            <h2 className="text-lg font-semibold text-[#0A4A6E] mb-2">
              {isEs ? "Correo enviado" : "Email sent"}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {isEs
                ? "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."
                : "If an account exists with that email, you'll receive a link to reset your password."}
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {isEs ? "Volver al inicio de sesión" : "Back to login"}
              </Button>
            </Link>
          </motion.div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-6">
              {isEs
                ? "Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña."
                : "Enter your email and we'll send you a link to reset your password."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">{isEs ? "Correo electrónico" : "Email"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="mt-1"
                  required
                />
              </div>

              {mutation.isError && (
                <p className="text-sm text-red-600">
                  {isEs ? "Error al enviar. Intenta de nuevo." : "Failed to send. Please try again."}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E]"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <><Loader2 className="animate-spin mr-2 h-4 w-4" /> {isEs ? "Enviando..." : "Sending..."}</>
                ) : (
                  isEs ? "Enviar enlace de recuperación" : "Send reset link"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-[#1C7BB1] hover:text-[#0A4A6E]">
                <ArrowLeft className="h-3.5 w-3.5 inline mr-1" />
                {isEs ? "Volver al inicio de sesión" : "Back to login"}
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
