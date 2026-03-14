import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { login, register, getCurrentUser, getSmartRedirect } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Mail, Lock, LogIn, UserPlus, User, Phone } from "lucide-react";
import LanguageSwitcher from "@/components/language-switcher";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  
  // Detectar si viene desde compra de plan
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPlan = urlParams.get('plan');
  const fromPurchase = urlParams.get('from') === 'purchase';
  const oauthError = urlParams.get('error');

  // Show toast on OAuth error
  if (oauthError === 'oauth_failed') {
    setTimeout(() => toast({
      title: language === 'es' ? 'Error de autenticación' : 'Authentication error',
      description: language === 'es' ? 'No se pudo iniciar sesión con ese proveedor.' : 'Could not sign in with that provider.',
      variant: 'destructive',
    }), 0);
  }

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
    phone: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(loginData);
      toast({
        title: t.welcomeBack,
        description: language === 'es' ? "Has iniciado sesión exitosamente." : "You have been successfully logged in.",
      });

      // Redirigir según el contexto
      const loggedUser = getCurrentUser();
      if (fromPurchase && selectedPlan) {
        setLocation(`/packages?plan=${selectedPlan}`);
      } else {
        setLocation(getSmartRedirect(loggedUser));
      }
    } catch (error) {
      toast({
        title: t.loginFailed,
        description: t.checkCredentials,
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
        title: t.accountCreated,
        description: t.journeyBegins,
      });
      
      // Redirigir según el contexto
      const newUser = getCurrentUser();
      if (fromPurchase && selectedPlan) {
        setLocation(`/packages?plan=${selectedPlan}`);
      } else {
        setLocation(getSmartRedirect(newUser));
      }
    } catch (error) {
      toast({
        title: t.registrationFailed,
        description: t.checkCredentials,
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
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full relative z-10"
      >
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
          
          {/* Mensaje contextual para usuarios */}
          <div className="mt-6 p-4 bg-gradient-to-r from-[#1C7BB1]/5 to-[#F59E1C]/5 rounded-lg border border-[#1C7BB1]/20">
            <p className="text-sm text-[#0A4A6E] text-center">
              {fromPurchase ? (
                language === 'es' 
                  ? '¡Estás a un paso de comenzar! Inicia sesión o regístrate para completar tu compra.'
                  : 'You\'re one step away from starting! Sign in or register to complete your purchase.'
              ) : (
                language === 'es'
                  ? '¡Regístrate y reserva tu primera clase GRATIS! Elige tu profesor favorito y comienza a aprender hoy.'
                  : 'Sign up and book your first class FREE! Choose your favorite tutor and start learning today.'
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

              {/* OAuth Buttons */}
              <div className="space-y-2 mt-5">
                <a href="/api/auth/google" className="block">
                  <Button variant="outline" type="button" className="w-full h-11 gap-3 border-gray-200 hover:border-[#1C7BB1]/40 hover:bg-[#1C7BB1]/5 transition-all">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    {language === 'es' ? 'Continuar con Google' : 'Continue with Google'}
                  </Button>
                </a>
                <a href="/api/auth/microsoft" className="block">
                  <Button variant="outline" type="button" className="w-full h-11 gap-3 border-gray-200 hover:border-[#1C7BB1]/40 hover:bg-[#1C7BB1]/5 transition-all">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
                      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
                      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
                      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
                    </svg>
                    {language === 'es' ? 'Continuar con Microsoft' : 'Continue with Microsoft'}
                  </Button>
                </a>
              </div>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-400 font-medium">
                    {language === 'es' ? 'o continúa con email' : 'or continue with email'}
                  </span>
                </div>
              </div>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2 group">
                    <Label htmlFor="email" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#1C7BB1]" />
                      {t.email}
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
                      {t.password}
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
                      <label htmlFor="remember" className="text-[#0A4A6E]">{t.rememberMe}</label>
                    </div>
                    <a href="#" className="text-[#1C7BB1] hover:text-[#0A4A6E] transition-colors duration-300">
                      {t.forgotPassword}
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
                        {t.loggingIn}
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        {t.login}
                      </>
                    )}
                  </Button>
                  
                  {/* Solo mostrar credenciales de prueba en desarrollo */}
                  {import.meta.env.DEV && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-[#EAF4FA] to-[#F8F9FA] rounded-lg border border-[#1C7BB1]/20 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-[#1C7BB1] rounded-full animate-pulse"></div>
                        <p className="text-sm font-medium text-[#0A4A6E]">{t.demoCredentials}:</p>
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
                        {t.firstName}
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
                        {t.lastName}
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
                      {t.username}
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
                    <Label htmlFor="phone" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#1C7BB1]" />
                      {language === 'es' ? 'Teléfono (opcional)' : 'Phone (optional)'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300 pl-10 focus:shadow-lg focus:shadow-[#1C7BB1]/10"
                      />
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1C7BB1]/40 w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <Label htmlFor="registerEmail" className="text-[#0A4A6E] font-medium text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#1C7BB1]" />
                      {t.email}
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
                      {t.password}
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
                      {language === 'es' ? 'Acepto los' : 'I accept the'}{' '}
                      <a href="#" className="text-[#1C7BB1] hover:text-[#0A4A6E] transition-colors duration-300">
                        {language === 'es' ? 'términos y condiciones' : 'terms and conditions'}
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
                        {t.registering}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        {t.signup}
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
