import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/header";
import { getCurrentUser, logout } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useCurrency, CURRENCIES } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import LanguageSwitcher from "@/components/language-switcher";
import {
  User, Lock, CreditCard, Package, Receipt, CalendarDays, CheckCircle2,
  Bell, Globe, Trash2, Loader2, Shield, ExternalLink, AlertTriangle,
  ChevronRight, Camera, Eye, EyeOff,
} from "lucide-react";
import { Link } from "wouter";

type Section = "account" | "security" | "payment" | "subscription" | "history" | "calendar" | "autoconfirm" | "notifications" | "language" | "delete";

interface UserSettings {
  currency: string;
  timezone: string;
  autoconfirmMode: string;
  calendarConnected: boolean;
  profileImage: string | null;
  notificationPreferences: {
    emailBooking: boolean;
    emailCancellation: boolean;
    emailReminder: boolean;
    emailMessages: boolean;
    emailAchievements: boolean;
  };
}

interface PaymentHistoryItem {
  id: number;
  amount: string;
  currency: string;
  description: string;
  status: string;
  createdAt: string;
}

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Bogota", "America/Mexico_City", "America/Lima", "America/Santiago",
  "America/Buenos_Aires", "America/Sao_Paulo", "America/Toronto",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Seoul", "Asia/Kolkata",
  "Australia/Sydney", "Pacific/Auckland",
];

export default function SettingsPage() {
  const { language } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const isEs = language === "es";

  const [activeSection, setActiveSection] = useState<Section>("account");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Password state
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState("");

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
    queryFn: () => apiRequest("GET", "/api/user/settings").then(r => r.json()),
    enabled: !!user,
  });

  // Fetch payment history
  const { data: paymentHistory = [], isLoading: historyLoading } = useQuery<PaymentHistoryItem[]>({
    queryKey: ["/api/user/payment-history"],
    queryFn: () => apiRequest("GET", "/api/user/payment-history").then(r => r.json()),
    enabled: !!user && activeSection === "history",
  });

  // Local state synced from server settings
  const [selectedTimezone, setSelectedTimezone] = useState("America/New_York");
  const [autoconfirmMode, setAutoconfirmMode] = useState("all");
  const [notifPrefs, setNotifPrefs] = useState({
    emailBooking: true,
    emailCancellation: true,
    emailReminder: true,
    emailMessages: true,
    emailAchievements: true,
  });

  useEffect(() => {
    if (settings) {
      setSelectedTimezone(settings.timezone);
      setAutoconfirmMode(settings.autoconfirmMode);
      setNotifPrefs(settings.notificationPreferences);
    }
  }, [settings]);

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<UserSettings>) =>
      apiRequest("PUT", "/api/user/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({ title: isEs ? "Guardado" : "Saved", description: isEs ? "Preferencias actualizadas." : "Preferences updated." });
    },
    onError: () => {
      toast({ title: "Error", description: isEs ? "No se pudo guardar." : "Could not save.", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("PUT", "/api/user/password", data).then(async r => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.message);
        }
        return r.json();
      }),
    onSuccess: () => {
      toast({ title: isEs ? "Contrasena actualizada" : "Password updated", description: isEs ? "Tu contrasena ha sido cambiada." : "Your password has been changed." });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || (isEs ? "Error al cambiar contrasena." : "Error changing password."), variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/user/${user?.id}`, data),
    onSuccess: () => {
      toast({ title: isEs ? "Perfil actualizado" : "Profile updated" });
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  });

  const updateNotifMutation = useMutation({
    mutationFn: (prefs: typeof notifPrefs) =>
      apiRequest("PUT", "/api/user/notification-preferences", prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({ title: isEs ? "Notificaciones actualizadas" : "Notifications updated" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/user/${user?.id}`),
    onSuccess: async () => {
      await logout();
      window.location.href = "https://www.passport2fluency.com";
    },
    onError: () => {
      toast({ title: "Error", description: isEs ? "No se pudo eliminar la cuenta." : "Could not delete account.", variant: "destructive" });
    },
  });

  const stripePortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-customer-portal-session", { userId: user?.id });
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.url) window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Error", description: isEs ? "No se pudo abrir el portal de pagos." : "Could not open payment portal.", variant: "destructive" });
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Error", description: isEs ? "Las contrasenas no coinciden." : "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: "Error", description: isEs ? "Minimo 6 caracteres." : "Minimum 6 characters.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== (isEs ? "ELIMINAR" : "DELETE")) return;
    deleteAccountMutation.mutate();
  };

  if (!user) return null;

  const sections: { id: Section; icon: any; label: string }[] = [
    { id: "account", icon: User, label: isEs ? "Cuenta" : "Account" },
    { id: "security", icon: Lock, label: isEs ? "Seguridad" : "Security" },
    { id: "payment", icon: CreditCard, label: isEs ? "Metodos de Pago" : "Payment Methods" },
    { id: "subscription", icon: Package, label: isEs ? "Suscripcion" : "Subscription" },
    { id: "history", icon: Receipt, label: isEs ? "Historial de Pagos" : "Payment History" },
    { id: "calendar", icon: CalendarDays, label: isEs ? "Calendario" : "Calendar" },
    { id: "autoconfirm", icon: CheckCircle2, label: isEs ? "Autoconfirmacion" : "Autoconfirmation" },
    { id: "notifications", icon: Bell, label: isEs ? "Notificaciones" : "Notifications" },
    { id: "language", icon: Globe, label: isEs ? "Idioma y Moneda" : "Language & Currency" },
    { id: "delete", icon: Trash2, label: isEs ? "Eliminar Cuenta" : "Delete Account" },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "account":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                {isEs ? "Informacion de Cuenta" : "Account Information"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Administra tu perfil y datos personales" : "Manage your profile and personal information"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-[#1C7BB1] flex items-center justify-center text-white text-2xl font-bold">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#F59E1C] rounded-full flex items-center justify-center shadow-md">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-[#0A4A6E]">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A4A6E]">{isEs ? "Nombre" : "First Name"}</Label>
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="border-[#1C7BB1]/20 focus:border-[#1C7BB1]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#0A4A6E]">{isEs ? "Apellido" : "Last Name"}</Label>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="border-[#1C7BB1]/20 focus:border-[#1C7BB1]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#0A4A6E]">Email</Label>
                <Input value={user.email} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-400">
                  {isEs ? "El email no se puede cambiar" : "Email cannot be changed"}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[#0A4A6E]">{isEs ? "Telefono" : "Phone"}</Label>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="border-[#1C7BB1]/20 focus:border-[#1C7BB1]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#0A4A6E]">{isEs ? "Zona Horaria" : "Timezone"}</Label>
                <Select value={selectedTimezone} onValueChange={val => {
                  setSelectedTimezone(val);
                  updateSettingsMutation.mutate({ timezone: val } as any);
                }}>
                  <SelectTrigger className="border-[#1C7BB1]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => updateProfileMutation.mutate({ firstName, lastName, phone })}
                disabled={updateProfileMutation.isPending}
                className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
              >
                {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEs ? "Guardar Cambios" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        );

      case "security":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {isEs ? "Seguridad" : "Security"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Administra tu contrasena y seguridad" : "Manage your password and security"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-[#0A4A6E]">{isEs ? "Contrasena Actual" : "Current Password"}</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPw ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={e => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
                      required
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A4A6E]">{isEs ? "Nueva Contrasena" : "New Password"}</Label>
                  <div className="relative">
                    <Input
                      type={showNewPw ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                      required
                      minLength={6}
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A4A6E]">{isEs ? "Confirmar Contrasena" : "Confirm Password"}</Label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                    className="border-[#1C7BB1]/20 focus:border-[#1C7BB1]"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Shield className="w-3 h-3" />
                  {isEs ? "Minimo 6 caracteres" : "Minimum 6 characters"}
                </div>

                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-[#F59E1C] hover:bg-[#F59E1C]/90 text-white"
                >
                  {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEs ? "Cambiar Contrasena" : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case "payment":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {isEs ? "Metodos de Pago" : "Payment Methods"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Administra tus metodos de pago a traves de Stripe" : "Manage your payment methods through Stripe"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#EAF4FA] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#1C7BB1]/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-[#1C7BB1]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#0A4A6E]">Stripe</p>
                    <p className="text-xs text-gray-500">
                      {isEs ? "Portal seguro de pagos" : "Secure payment portal"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {isEs
                    ? "Tus metodos de pago se administran de forma segura a traves de Stripe. Haz clic abajo para agregar, cambiar o eliminar tarjetas."
                    : "Your payment methods are securely managed through Stripe. Click below to add, change, or remove cards."}
                </p>
                <Button
                  onClick={() => stripePortalMutation.mutate()}
                  disabled={stripePortalMutation.isPending}
                  className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
                >
                  {stripePortalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {isEs ? "Gestionar en Stripe" : "Manage in Stripe"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "subscription":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                {isEs ? "Suscripcion" : "Subscription"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Administra tu plan y creditos" : "Manage your plan and credits"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Current Plan */}
              <div className="bg-gradient-to-r from-[#1C7BB1]/10 to-[#F59E1C]/10 rounded-xl p-5 border border-[#1C7BB1]/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{isEs ? "Plan Actual" : "Current Plan"}</p>
                    <p className="text-xl font-bold text-[#0A4A6E] mt-1">
                      {user.userType === "trial" ? (isEs ? "Prueba Gratuita" : "Free Trial") :
                       user.userType === "customer" ? (isEs ? "Cliente Activo" : "Active Customer") :
                       (isEs ? "Lead" : "Lead")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{isEs ? "Creditos Restantes" : "Remaining Credits"}</p>
                    <p className="text-2xl font-bold text-[#1C7BB1]">{user.classCredits ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/packages">
                  <Button className="bg-[#F59E1C] hover:bg-[#F59E1C]/90 text-white flex-1">
                    <Package className="w-4 h-4 mr-2" />
                    {isEs ? "Cambiar Plan" : "Change Plan"}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => stripePortalMutation.mutate()}
                  disabled={stripePortalMutation.isPending}
                  className="border-[#1C7BB1] text-[#1C7BB1] hover:bg-[#1C7BB1] hover:text-white flex-1"
                >
                  {stripePortalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {isEs ? "Gestionar Suscripcion" : "Manage Subscription"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "history":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                {isEs ? "Historial de Pagos" : "Payment History"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Revisa tus transacciones anteriores" : "Review your past transactions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#1C7BB1]" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">{isEs ? "No hay transacciones aun" : "No transactions yet"}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {paymentHistory.map(item => (
                    <div key={item.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#0A4A6E]">{item.description || (isEs ? "Compra de clases" : "Class purchase")}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#0A4A6E]">
                          ${parseFloat(item.amount).toFixed(2)} {item.currency || "USD"}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === "completed" ? "bg-green-100 text-green-700" :
                          item.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {item.status === "completed" ? (isEs ? "Completado" : "Completed") :
                           item.status === "pending" ? (isEs ? "Pendiente" : "Pending") :
                           item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "calendar":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                {isEs ? "Calendario" : "Calendar"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Conecta tu calendario para sincronizar clases" : "Connect your calendar to sync classes"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-[#EAF4FA] rounded-xl p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <CalendarDays className="w-6 h-6 text-[#1C7BB1]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#0A4A6E]">Google Calendar</p>
                    <p className="text-xs text-gray-500">
                      {settings?.calendarConnected
                        ? (isEs ? "Conectado" : "Connected")
                        : (isEs ? "No conectado" : "Not connected")}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${settings?.calendarConnected ? "bg-green-400" : "bg-gray-300"}`} />
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {isEs
                    ? "Al conectar tu calendario, tus clases reservadas se agregaran automaticamente a Google Calendar."
                    : "By connecting your calendar, your booked classes will be automatically added to Google Calendar."}
                </p>

                <Button
                  onClick={() => updateSettingsMutation.mutate({ calendarConnected: !settings?.calendarConnected } as any)}
                  variant={settings?.calendarConnected ? "outline" : "default"}
                  className={settings?.calendarConnected
                    ? "border-red-300 text-red-600 hover:bg-red-50"
                    : "bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
                  }
                >
                  {settings?.calendarConnected
                    ? (isEs ? "Desconectar" : "Disconnect")
                    : (isEs ? "Conectar Google Calendar" : "Connect Google Calendar")}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "autoconfirm":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {isEs ? "Autoconfirmacion de Clases" : "Lesson Autoconfirmation"}
              </CardTitle>
              <CardDescription>
                {isEs
                  ? "Configura como se confirman tus clases automaticamente"
                  : "Configure how your lessons are automatically confirmed"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Explanation */}
              <div className="bg-[#EAF4FA] rounded-xl p-4">
                <p className="text-sm text-[#0A4A6E] leading-relaxed">
                  {isEs
                    ? "Cuando una clase termina, se confirma automaticamente. Para clases en la plataforma, se confirma 15 minutos despues. Para clases fuera de la plataforma, se confirma 72 horas despues."
                    : "When a class ends, it is automatically confirmed. For in-platform classes, it's confirmed 15 minutes after. For external classes, it's confirmed 72 hours after."}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setAutoconfirmMode("self_only");
                    updateSettingsMutation.mutate({ autoconfirmMode: "self_only" } as any);
                  }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    autoconfirmMode === "self_only"
                      ? "border-[#1C7BB1] bg-[#1C7BB1]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      autoconfirmMode === "self_only" ? "border-[#1C7BB1]" : "border-gray-300"
                    }`}>
                      {autoconfirmMode === "self_only" && <div className="w-2.5 h-2.5 rounded-full bg-[#1C7BB1]" />}
                    </div>
                    <div>
                      <p className="font-medium text-[#0A4A6E]">
                        {isEs ? "Solo clases programadas por mi" : "Only classes scheduled by me"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isEs
                          ? "Las clases recurrentes no se confirman automaticamente"
                          : "Recurring classes are not auto-confirmed"}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setAutoconfirmMode("all");
                    updateSettingsMutation.mutate({ autoconfirmMode: "all" } as any);
                  }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    autoconfirmMode === "all"
                      ? "border-[#1C7BB1] bg-[#1C7BB1]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      autoconfirmMode === "all" ? "border-[#1C7BB1]" : "border-gray-300"
                    }`}>
                      {autoconfirmMode === "all" && <div className="w-2.5 h-2.5 rounded-full bg-[#1C7BB1]" />}
                    </div>
                    <div>
                      <p className="font-medium text-[#0A4A6E]">
                        {isEs ? "Autoconfirmar todas las clases" : "Auto-confirm all classes"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isEs
                          ? "Incluye clases recurrentes y programadas por el tutor"
                          : "Includes recurring and tutor-scheduled classes"}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        );

      case "notifications":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {isEs ? "Notificaciones" : "Notifications"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Elige que notificaciones quieres recibir" : "Choose which notifications you want to receive"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "emailBooking" as const, label: isEs ? "Confirmacion de reserva" : "Booking confirmation", desc: isEs ? "Email cuando reservas o te reservan una clase" : "Email when you book or someone books a class" },
                { key: "emailCancellation" as const, label: isEs ? "Cancelaciones" : "Cancellations", desc: isEs ? "Email cuando se cancela una clase" : "Email when a class is cancelled" },
                { key: "emailReminder" as const, label: isEs ? "Recordatorio 24h" : "24h reminder", desc: isEs ? "Recordatorio un dia antes de tu clase" : "Reminder one day before your class" },
                { key: "emailMessages" as const, label: isEs ? "Mensajes nuevos" : "New messages", desc: isEs ? "Email cuando recibes un mensaje" : "Email when you receive a message" },
                { key: "emailAchievements" as const, label: isEs ? "Logros" : "Achievements", desc: isEs ? "Email cuando desbloqueas un logro" : "Email when you unlock an achievement" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#0A4A6E]">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifPrefs[item.key]}
                    onCheckedChange={(checked) => {
                      const updated = { ...notifPrefs, [item.key]: checked };
                      setNotifPrefs(updated);
                      updateNotifMutation.mutate(updated);
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case "language":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] text-lg flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {isEs ? "Idioma y Moneda" : "Language & Currency"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Configura tu idioma y moneda preferidos" : "Set your preferred language and currency"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-[#0A4A6E]">{isEs ? "Idioma" : "Language"}</p>
                  <p className="text-sm text-gray-500">
                    {isEs ? "Idioma actual: Espanol" : "Current language: English"}
                  </p>
                </div>
                <LanguageSwitcher />
              </div>

              {/* Currency */}
              <div>
                <p className="font-medium text-[#0A4A6E] mb-2">{isEs ? "Moneda" : "Currency"}</p>
                <p className="text-sm text-gray-500 mb-3">
                  {isEs ? "Moneda para mostrar precios" : "Currency for displaying prices"}
                </p>
                <Select value={currency} onValueChange={val => {
                  setCurrency(val);
                  updateSettingsMutation.mutate({ currency: val } as any);
                }}>
                  <SelectTrigger className="border-[#1C7BB1]/20 w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case "delete":
        return (
          <Card className="border-0 shadow-lg border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 text-lg flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                {isEs ? "Eliminar Cuenta" : "Delete Account"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Esta accion es permanente e irreversible" : "This action is permanent and irreversible"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700 space-y-2">
                    <p className="font-medium">
                      {isEs ? "Al eliminar tu cuenta:" : "By deleting your account:"}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>{isEs ? "Perderas acceso a todas tus clases" : "You will lose access to all your classes"}</li>
                      <li>{isEs ? "Tu historial de mensajes sera eliminado" : "Your message history will be deleted"}</li>
                      <li>{isEs ? "Los creditos no usados se perderan" : "Unused credits will be lost"}</li>
                      <li>{isEs ? "No podras recuperar tu cuenta" : "You won't be able to recover your account"}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isEs ? "Eliminar mi cuenta" : "Delete my account"}
              </Button>

              {/* Delete Confirmation Dialog */}
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      {isEs ? "Confirmar Eliminacion" : "Confirm Deletion"}
                    </DialogTitle>
                    <DialogDescription>
                      {isEs
                        ? `Escribe "${isEs ? "ELIMINAR" : "DELETE"}" para confirmar la eliminacion de tu cuenta.`
                        : `Type "DELETE" to confirm the deletion of your account.`}
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder={isEs ? "ELIMINAR" : "DELETE"}
                    className="border-red-300 focus:border-red-500"
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(""); }}>
                      {isEs ? "Cancelar" : "Cancel"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== (isEs ? "ELIMINAR" : "DELETE") || deleteAccountMutation.isPending}
                    >
                      {deleteAccountMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {isEs ? "Eliminar Permanentemente" : "Delete Permanently"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-[#0A4A6E]">
            {isEs ? "Configuracion" : "Settings"}
          </h1>
          <p className="text-[#0A4A6E]/60 mt-1">
            {isEs ? "Administra tus preferencias y cuenta" : "Manage your preferences and account"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar — Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="border-0 shadow-lg sticky top-24">
              <CardContent className="p-2">
                <nav className="space-y-0.5">
                  {sections.map(s => {
                    const Icon = s.icon;
                    const isActive = activeSection === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                          isActive
                            ? "bg-[#1C7BB1]/10 text-[#1C7BB1] font-medium"
                            : s.id === "delete"
                              ? "text-red-500 hover:bg-red-50"
                              : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{s.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Section Selector */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-2">
                {(() => {
                  const sec = sections.find(s => s.id === activeSection);
                  const Icon = sec?.icon || User;
                  return (
                    <>
                      <Icon className="w-4 h-4 text-[#1C7BB1]" />
                      <span className="font-medium text-[#0A4A6E]">{sec?.label}</span>
                    </>
                  );
                })()}
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${mobileMenuOpen ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                    {sections.map(s => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setActiveSection(s.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${
                            activeSection === s.id
                              ? "text-[#1C7BB1] font-medium bg-[#1C7BB1]/5"
                              : s.id === "delete"
                                ? "text-red-500"
                                : "text-gray-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {settingsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1C7BB1]" />
                  </div>
                ) : (
                  renderSection()
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
