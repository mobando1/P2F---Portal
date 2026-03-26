import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { setCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react";

export default function TutorInvitePage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState("");

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const { data: inviteData, isLoading, isError } = useQuery<{ name: string; email: string }>({
    queryKey: [`/api/auth/tutor-invite/${token}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/auth/tutor-invite/${token}/accept`, { password });
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.user) {
        setCurrentUser(data.user);
      }
      // Use full page reload to ensure session cookie is established before ProtectedRoute checks
      window.location.href = "/tutor-portal";
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");
    if (password.length < 8) {
      setClientError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setClientError("Las contraseñas no coinciden.");
      return;
    }
    acceptMutation.mutate();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h2>
          <p className="text-gray-500">Este link de invitación no es válido.</p>
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

  if (isError || !inviteData) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link inválido o expirado</h2>
          <p className="text-gray-500 text-sm">
            Este link de invitación no es válido o ya expiró. Contacta al administrador para obtener un nuevo link.
          </p>
        </div>
      </div>
    );
  }

  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <CheckCircle className="mx-auto mb-4 text-green-500" size={56} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Cuenta activada!</h2>
          <p className="text-gray-500">Redirigiendo a tu panel...</p>
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
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#EAF4FA] mb-4">
            <Lock size={28} className="text-[#1C7BB1]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0A4A6E]">Activa tu cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">Passport2Fluency</p>
        </div>

        {/* Greeting */}
        <div className="bg-[#EAF4FA] rounded-xl p-4 mb-6">
          <p className="text-[#0A4A6E] font-medium">Hola, {inviteData.name} 👋</p>
          <p className="text-sm text-[#1C7BB1] mt-0.5">{inviteData.email}</p>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          El equipo de Passport2Fluency te ha invitado como profesor. Crea tu contraseña para activar tu cuenta.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              className="mt-1"
              required
            />
          </div>

          {clientError && (
            <p className="text-sm text-red-600">{clientError}</p>
          )}
          {acceptMutation.isError && (
            <p className="text-sm text-red-600">
              {(acceptMutation.error as any)?.message || "Error al activar la cuenta. Intenta de nuevo."}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E]"
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Activando...</>
            ) : (
              "Activar cuenta →"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
