import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { login, register } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Mail, Lock, LogIn, UserPlus, User } from "lucide-react";
import LanguageSwitcher from "@/components/language-switcher";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  
  // Detectar si viene desde compra de plan
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPlan = urlParams.get('plan');
  const fromPurchase = urlParams.get('from') === 'purchase';

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    username: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(loginData);
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
      
      // Redirigir según el contexto
      if (fromPurchase && selectedPlan) {
        setLocation(`/packages?plan=${selectedPlan}`);
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await register(registerData);
      toast({
        title: "Account created!",
        description: "Welcome to EspañolPro. Your learning journey begins now.",
      });
      
      // Redirigir según el contexto
      if (fromPurchase && selectedPlan) {
        setLocation(`/packages?plan=${selectedPlan}`);
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative" style={{ backgroundColor: '#EAF4FA' }}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#1C7BB1]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F59E1C]/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Language Switcher */}
        <div className="absolute top-0 right-0 z-20">
          <LanguageSwitcher />
        </div>
        
        {/* Logo y mensaje de bienvenida */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <img 
              src="/attached_assets/a1c5a1_9514ede9e3124d7a9adf78f5dcf07f28~mv2_1752436886046.png" 
              alt="Passport2Fluency" 
              className="h-16 w-auto mx-auto mb-6 transform hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute -inset-4 bg-gradient-to-r from-[#1C7BB1]/10 to-[#F59E1C]/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <h1 className="text-3xl font-bold text-[#0A4A6E] mb-2 animate-in slide-in-from-bottom-4 duration-500">
            {t.welcome}
          </h1>
          <p className="text-[#0A4A6E]/70 text-lg animate-in slide-in-from-bottom-6 duration-700">
            {t.continueJourney}
          </p>
          
          {/* Mensaje para usuarios nuevos que vienen desde Wix */}
          <div className="mt-6 p-4 bg-gradient-to-r from-[#1C7BB1]/5 to-[#F59E1C]/5 rounded-lg border border-[#1C7BB1]/20">
            <p className="text-sm text-[#0A4A6E] text-center">
              {fromPurchase ? (
                t.language === 'es' 
                  ? '¡Estás a un paso de comenzar! Inicia sesión o regístrate para completar tu compra.'
                  : 'You\'re one step away from starting! Sign in or register to complete your purchase.'
              ) : (
                t.language === 'es' 
                  ? '¿Completaste tu clase gratuita? ¡Perfecto! Ahora puedes acceder a tu portal de estudiante.'
                  : 'Completed your free trial? Perfect! Now you can access your student portal.'
              )}
            </p>
          </div>
        </div>

        <Card className="shadow-xl border-0 backdrop-blur-sm bg-white/95 hover:shadow-2xl transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-10">
          <CardContent className="p-8 relative">
            {/* Gradiente decorativo interno */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1C7BB1] via-[#F59E1C] to-[#1C7BB1]"></div>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#F8F9FA] p-1 rounded-xl">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-[#1C7BB1] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-medium"
                >
                  {t.login}
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="data-[state=active]:bg-[#1C7BB1] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-medium"
                >
                  {t.signup}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-6 mt-6">
                  <div className="space-y-2 group">
                    <Label htmlFor="email" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#1C7BB1]" />
                      Correo Electrónico
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300 pl-10 focus:shadow-lg focus:shadow-[#1C7BB1]/10"
                        required
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1C7BB1]/40 w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 group">
                    <Label htmlFor="password" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#1C7BB1]" />
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        placeholder="Tu contraseña"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300 pl-10 focus:shadow-lg focus:shadow-[#1C7BB1]/10"
                        required
                      />
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1C7BB1]/40 w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="remember" 
                        className="rounded text-[#1C7BB1] focus:ring-[#1C7BB1] border-[#1C7BB1]/20" 
                      />
                      <label htmlFor="remember" className="text-[#0A4A6E]">Recordarme</label>
                    </div>
                    <a href="#" className="text-[#1C7BB1] hover:text-[#0A4A6E] transition-colors duration-300">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] hover:from-[#0A4A6E] hover:to-[#1C7BB1] text-white font-medium h-12 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] transform flex items-center justify-center gap-2" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Iniciando sesión...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Iniciar Sesión
                      </>
                    )}
                  </Button>
                  
                  {/* Solo mostrar credenciales de prueba en desarrollo */}
                  {import.meta.env.DEV && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-[#EAF4FA] to-[#F8F9FA] rounded-lg border border-[#1C7BB1]/20 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-[#1C7BB1] rounded-full animate-pulse"></div>
                        <p className="text-sm font-medium text-[#0A4A6E]">Credenciales de Prueba:</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-[#0A4A6E] font-mono bg-white/50 px-2 py-1 rounded">
                          📧 juan.sanchez@example.com
                        </p>
                        <p className="text-xs text-[#0A4A6E] font-mono bg-white/50 px-2 py-1 rounded">
                          🔒 password123
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="firstName" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-[#1C7BB1]" />
                        Nombre
                      </Label>
                      <div className="relative">
                        <Input
                          id="firstName"
                          placeholder="Tu nombre"
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                          className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300 pl-10 focus:shadow-lg focus:shadow-[#1C7BB1]/10"
                          required
                        />
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1C7BB1]/40 w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 group">
                      <Label htmlFor="lastName" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-[#1C7BB1]" />
                        Apellido
                      </Label>
                      <div className="relative">
                        <Input
                          id="lastName"
                          placeholder="Tu apellido"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                          className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300 pl-10 focus:shadow-lg focus:shadow-[#1C7BB1]/10"
                          required
                        />
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1C7BB1]/40 w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 group">
                    <Label htmlFor="username" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-[#1C7BB1]" />
                      Nombre de usuario
                    </Label>
                    <div className="relative">
                      <Input
                        id="username"
                        placeholder="Elige un nombre de usuario"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300 pl-10 focus:shadow-lg focus:shadow-[#1C7BB1]/10"
                        required
                      />
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1C7BB1]/40 w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 group">
                    <Label htmlFor="registerEmail" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#1C7BB1]" />
                      Correo Electrónico
                    </Label>
                    <div className="relative">
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="tu@email.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300 pl-10 focus:shadow-lg focus:shadow-[#1C7BB1]/10"
                        required
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1C7BB1]/40 w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 group">
                    <Label htmlFor="registerPassword" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#1C7BB1]" />
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="registerPassword"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300 pl-10 focus:shadow-lg focus:shadow-[#1C7BB1]/10"
                        required
                      />
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1C7BB1]/40 w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      className="rounded text-[#1C7BB1] focus:ring-[#1C7BB1] border-[#1C7BB1]/20" 
                      required
                    />
                    <label htmlFor="terms" className="text-[#0A4A6E]">
                      Acepto los{' '}
                      <a href="#" className="text-[#1C7BB1] hover:text-[#0A4A6E] transition-colors duration-300">
                        términos y condiciones
                      </a>
                    </label>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-[#F59E1C] to-[#F59E1C]/80 hover:from-[#F59E1C]/90 hover:to-[#F59E1C] text-white font-medium h-12 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] transform flex items-center justify-center gap-2" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Registrando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Registrarse
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
