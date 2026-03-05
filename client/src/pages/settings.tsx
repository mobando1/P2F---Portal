import { useState } from "react";
import Header from "@/components/header";
import { getCurrentUser } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import LanguageSwitcher from "@/components/language-switcher";
import { Globe, Lock, Loader2, Shield } from "lucide-react";

export default function SettingsPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const user = getCurrentUser();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: language === "es" ? "Error" : "Error",
        description: language === "es"
          ? "Las contrasenas no coinciden."
          : "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: language === "es" ? "Error" : "Error",
        description: language === "es"
          ? "La contrasena debe tener al menos 6 caracteres."
          : "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiRequest("PUT", `/api/user/${user.id}`, {
        password: passwordData.newPassword,
      });

      toast({
        title: language === "es" ? "Contrasena Actualizada" : "Password Updated",
        description: language === "es"
          ? "Tu contrasena ha sido cambiada exitosamente."
          : "Your password has been changed successfully.",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast({
        title: language === "es" ? "Error" : "Error",
        description: language === "es"
          ? "Hubo un problema cambiando tu contrasena."
          : "There was a problem changing your password.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0A4A6E]">
            {language === "es" ? "Configuracion" : "Settings"}
          </h1>
          <p className="text-[#0A4A6E]/70 mt-1">
            {language === "es"
              ? "Administra tus preferencias y seguridad"
              : "Manage your preferences and security"}
          </p>
        </div>

        <div className="space-y-6">
          {/* Language Preference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {language === "es" ? "Idioma" : "Language"}
              </CardTitle>
              <CardDescription>
                {language === "es"
                  ? "Selecciona tu idioma preferido para la interfaz"
                  : "Select your preferred interface language"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {language === "es"
                      ? "Idioma actual:"
                      : "Current language:"}
                  </p>
                  <p className="font-medium text-[#0A4A6E]">
                    {language === "es" ? "Espanol" : "English"}
                  </p>
                </div>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {language === "es" ? "Cambiar Contrasena" : "Change Password"}
              </CardTitle>
              <CardDescription>
                {language === "es"
                  ? "Actualiza tu contrasena para mayor seguridad"
                  : "Update your password for better security"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-[#0A4A6E]">
                    {language === "es" ? "Contrasena Actual" : "Current Password"}
                  </Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-[#0A4A6E]">
                    {language === "es" ? "Nueva Contrasena" : "New Password"}
                  </Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[#0A4A6E]">
                    {language === "es" ? "Confirmar Contrasena" : "Confirm Password"}
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Shield className="w-3 h-3" />
                  {language === "es"
                    ? "La contrasena debe tener al menos 6 caracteres"
                    : "Password must be at least 6 characters"}
                </div>

                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-[#F59E1C] hover:bg-[#F59E1C]/90 text-white"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  {isChangingPassword
                    ? (language === "es" ? "Cambiando..." : "Changing...")
                    : (language === "es" ? "Cambiar Contrasena" : "Change Password")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
