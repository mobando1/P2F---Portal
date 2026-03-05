import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, GraduationCap, Calendar, CreditCard, Save, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const user = getCurrentUser();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: "",
  });

  // Fetch full user data from the server
  const { data: userData } = useQuery<{
    user: {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      username: string;
      level: string;
      avatar: string | null;
      phone: string | null;
      classCredits: number;
      createdAt: string;
    };
  }>({
    queryKey: ["/api/auth/me"],
    enabled: !!user,
  });

  useEffect(() => {
    if (userData?.user) {
      setFormData({
        firstName: userData.user.firstName || "",
        lastName: userData.user.lastName || "",
        phone: userData.user.phone || "",
      });
    }
  }, [userData]);

  const fullUser = userData?.user;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      const response = await apiRequest("PUT", `/api/user/${user.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
      });
      const result = await response.json();

      if (result.user) {
        setCurrentUser({
          ...user,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        });
      }

      toast({
        title: language === "es" ? "Perfil Actualizado" : "Profile Updated",
        description: language === "es"
          ? "Tu información ha sido actualizada exitosamente."
          : "Your information has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: language === "es" ? "Error" : "Error",
        description: language === "es"
          ? "Hubo un problema actualizando tu perfil."
          : "There was a problem updating your profile.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0A4A6E]">
            {language === "es" ? "Mi Perfil" : "My Profile"}
          </h1>
          <p className="text-[#0A4A6E]/70 mt-1">
            {language === "es"
              ? "Gestiona tu informacion personal"
              : "Manage your personal information"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg">
                {language === "es" ? "Informacion General" : "General Info"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-[#1C7BB1] flex items-center justify-center text-white text-2xl font-bold">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-lg font-semibold text-[#0A4A6E]">
                  {fullUser?.firstName || user.firstName} {fullUser?.lastName || user.lastName}
                </p>
                <p className="text-sm text-gray-500">{fullUser?.email || user.email}</p>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="w-4 h-4 text-[#1C7BB1]" />
                  <span className="text-gray-600">
                    {language === "es" ? "Nivel:" : "Level:"}
                  </span>
                  <Badge variant="secondary" className="bg-[#1C7BB1]/10 text-[#1C7BB1]">
                    {fullUser?.level || user.level}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <CreditCard className="w-4 h-4 text-[#F59E1C]" />
                  <span className="text-gray-600">
                    {language === "es" ? "Creditos:" : "Credits:"}
                  </span>
                  <span className="font-medium text-[#0A4A6E]">
                    {fullUser?.classCredits ?? 0} {language === "es" ? "clases" : "classes"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-[#1C7BB1]" />
                  <span className="text-gray-600">
                    {language === "es" ? "Miembro desde:" : "Member since:"}
                  </span>
                  <span className="font-medium text-[#0A4A6E] text-xs">
                    {formatDate(fullUser?.createdAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                {language === "es" ? "Editar Perfil" : "Edit Profile"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-[#0A4A6E]">
                      {t.firstName}
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-[#0A4A6E]">
                      {t.lastName}
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#0A4A6E]">
                    {t.email}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      value={fullUser?.email || user.email}
                      disabled
                      className="bg-gray-50 text-gray-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {language === "es"
                      ? "El correo no puede ser modificado."
                      : "Email cannot be changed."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[#0A4A6E]">
                    {language === "es" ? "Telefono" : "Phone"}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#1C7BB1] hover:bg-[#1C7BB1]/90 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isSaving
                    ? (language === "es" ? "Guardando..." : "Saving...")
                    : (language === "es" ? "Guardar Cambios" : "Save Changes")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
