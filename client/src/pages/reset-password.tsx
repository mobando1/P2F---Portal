import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { Lock, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const { language } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState("");
  const isEs = language === "es";

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const { data: tokenData, isLoading, isError } = useQuery<{ valid: boolean; email: string }>({
    queryKey: [`/api/auth/reset-password/${token}`],
    queryFn: () => apiRequest("GET", `/api/auth/reset-password/${token}`).then(r => {
      if (!r.ok) throw new Error("Invalid token");
      return r.json();
    }),
    enabled: !!token,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error");
      }
      return res.json();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");
    if (password.length < 8) {
      setClientError(isEs ? "La contraseña debe tener al menos 8 caracteres." : "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setClientError(isEs ? "Las contraseñas no coinciden." : "Passwords don't match.");
      return;
    }
    mutation.mutate();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">{isEs ? "Link inválido" : "Invalid link"}</h2>
          <Link href="/forgot-password">
            <Button variant="outline" className="mt-4">{isEs ? "Solicitar nuevo enlace" : "Request new link"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#1C7BB1]" />
      </div>
    );
  }

  if (isError || !tokenData) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {isEs ? "Enlace inválido o expirado" : "Invalid or expired link"}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {isEs ? "Solicita un nuevo enlace de recuperación." : "Please request a new reset link."}
          </p>
          <Link href="/forgot-password">
            <Button variant="outline">{isEs ? "Solicitar nuevo enlace" : "Request new link"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={56} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {isEs ? "Contraseña actualizada" : "Password updated"}
          </h2>
          <p className="text-gray-500 mb-6">
            {isEs ? "Ya puedes iniciar sesión con tu nueva contraseña." : "You can now log in with your new password."}
          </p>
          <Link href="/login">
            <Button className="bg-[#1C7BB1] hover:bg-[#0A4A6E]">
              {isEs ? "Ir a iniciar sesión" : "Go to login"}
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#EAF4FA] mb-4">
            <Lock size={28} className="text-[#1C7BB1]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0A4A6E]">
            {isEs ? "Nueva contraseña" : "New password"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{tokenData.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">{isEs ? "Nueva contraseña" : "New password"}</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEs ? "Mínimo 6 caracteres" : "Min 6 characters"}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{isEs ? "Confirmar contraseña" : "Confirm password"}</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={isEs ? "Repite tu contraseña" : "Repeat your password"}
              className="mt-1"
              required
            />
          </div>

          {clientError && <p className="text-sm text-red-600">{clientError}</p>}
          {mutation.isError && (
            <p className="text-sm text-red-600">
              {(mutation.error as any)?.message || (isEs ? "Error al restablecer. Intenta de nuevo." : "Reset failed. Try again.")}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E]"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <><Loader2 className="animate-spin mr-2 h-4 w-4" /> {isEs ? "Guardando..." : "Saving..."}</>
            ) : (
              isEs ? "Restablecer contraseña" : "Reset password"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-[#1C7BB1] hover:text-[#0A4A6E]">
            <ArrowLeft className="h-3.5 w-3.5 inline mr-1" />
            {isEs ? "Volver al inicio de sesión" : "Back to login"}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
