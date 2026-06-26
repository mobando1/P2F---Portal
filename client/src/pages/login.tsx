import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { login, register, getCurrentUser, getSmartRedirect } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Mail, Lock, LogIn, UserPlus, User, Phone, Sparkles, Video, Map } from "lucide-react";
import LanguageSwitcher from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

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
  if (oauthError === 'oauth_failed' || oauthError === 'google_not_configured' || oauthError === 'microsoft_not_configured') {
    setTimeout(() => toast({
      title: language === 'es' ? 'Error de autenticación' : 'Authentication error',
      description: oauthError === 'google_not_configured'
        ? (language === 'es' ? 'Google login no está configurado aún.' : 'Google login is not configured yet.')
        : oauthError === 'microsoft_not_configured'
        ? (language === 'es' ? 'Microsoft login no está configurado aún.' : 'Microsoft login is not configured yet.')
        : (language === 'es' ? 'No se pudo iniciar sesión con ese proveedor.' : 'Could not sign in with that provider.'),
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
    } catch (error: any) {
      const msg = error?.message || "";
      // Show server error message if available (e.g. "Invalid credentials")
      toast({
        title: t.loginFailed,
        description: msg.includes("401") ? t.checkCredentials : (msg || t.checkCredentials),
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
    } catch (error: any) {
      const msg = error?.message || "";
      toast({
        title: t.registrationFailed,
        description: msg || t.checkCredentials,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "h-12 pl-10 text-base border-input bg-background transition-all duration-300 focus:border-primary focus:ring-primary/20 focus:shadow-lg focus:shadow-primary/10";

  const features = [
    { icon: Video, text: t.loginFeatureLive },
    { icon: Sparkles, text: t.loginFeatureAi },
    { icon: Map, text: t.loginFeaturePath },
  ];

  const oauthButtons = (mode: "login" | "register") => (
    <>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 font-medium text-muted-foreground">
            {mode === "login"
              ? language === 'es' ? 'o continúa con' : 'or continue with'
              : language === 'es' ? 'o regístrate con' : 'or sign up with'}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <a href="/api/auth/google" className="block">
          <Button variant="outline" type="button" className="w-full h-11 gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all">
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
          <Button variant="outline" type="button" className="w-full h-11 gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all">
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
    </>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* ===== Left brand panel (intentionally always-dark, hidden on mobile) ===== */}
      <div className="aurora-bg relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[hsl(208,74%,16%)] via-[hsl(200,69%,30%)] to-[hsl(209,75%,11%)] p-12 text-white lg:flex">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10"
        >
          <span className="inline-flex rounded-2xl bg-white/95 px-4 py-2.5 shadow-lg">
            <img
              src="/attached_assets/a1c5a1_9514ede9e3124d7a9adf78f5dcf07f28~mv2_1752436886046.png"
              alt="Passport2Fluency"
              className="h-9 w-auto"
            />
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="relative z-10 max-w-md"
        >
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight">
            {t.loginBrandHeadline}
          </h2>
          <p className="mt-4 text-lg text-white/75">{t.loginBrandSubtitle}</p>

          <ul className="mt-8 space-y-3">
            {features.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.25 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-white/90">{f.text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Floating product preview cards (social proof) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative z-10 flex gap-3"
        >
          <div className="glass rounded-2xl px-4 py-3 !bg-white/10 !border-white/20">
            <p className="font-display text-2xl font-bold tabular-nums">98%</p>
            <p className="text-xs text-white/70">{language === 'es' ? 'satisfacción' : 'satisfaction'}</p>
          </div>
          <div className="glass rounded-2xl px-4 py-3 !bg-white/10 !border-white/20">
            <p className="font-display text-2xl font-bold tabular-nums">12k+</p>
            <p className="text-xs text-white/70">{language === 'es' ? 'clases dadas' : 'classes taught'}</p>
          </div>
          <div className="glass rounded-2xl px-4 py-3 !bg-white/10 !border-white/20">
            <p className="font-display text-2xl font-bold tabular-nums">4.9★</p>
            <p className="text-xs text-white/70">{language === 'es' ? 'promedio' : 'avg rating'}</p>
          </div>
        </motion.div>
      </div>

      {/* ===== Right form panel ===== */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:min-h-0">
        <div className="absolute right-4 top-4 z-20 flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Mobile-only logo + headline */}
          <div className="mb-8 text-center lg:hidden">
            <img
              src="/attached_assets/a1c5a1_9514ede9e3124d7a9adf78f5dcf07f28~mv2_1752436886046.png"
              alt="Passport2Fluency"
              className="mx-auto mb-4 h-14 w-auto"
            />
            <h1 className="font-display text-2xl font-bold text-foreground">{t.welcome}</h1>
            <p className="mt-1 text-muted-foreground">{t.continueJourney}</p>
          </div>

          {/* Desktop headline */}
          <div className="mb-6 hidden lg:block">
            <h1 className="font-display text-3xl font-bold text-foreground">{t.welcome}</h1>
            <p className="mt-1 text-muted-foreground">{t.continueJourney}</p>
          </div>

          {/* Contextual message */}
          <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4">
            <p className="text-sm text-foreground">
              {fromPurchase
                ? language === 'es'
                  ? '¡Estás a un paso de comenzar! Inicia sesión o regístrate para completar tu compra.'
                  : 'You\'re one step away from starting! Sign in or register to complete your purchase.'
                : language === 'es'
                  ? '¡Regístrate y reserva tu primera clase GRATIS! Elige tu profesor favorito y comienza a aprender hoy.'
                  : 'Sign up and book your first class FREE! Choose your favorite tutor and start learning today.'}
            </p>
          </div>

          <Card className="relative overflow-hidden border-border/60 shadow-xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardContent className="p-6 sm:p-8">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
                  <TabsTrigger
                    value="login"
                    className="rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    {t.login}
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    {t.signup}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="mt-6 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Mail className="h-4 w-4 text-primary" />
                        {t.email}
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className={inputClass}
                          required
                        />
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Lock className="h-4 w-4 text-primary" />
                        {t.password}
                      </Label>
                      <div className="relative">
                        <PasswordInput
                          id="password"
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          className={inputClass}
                          required
                        />
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="remember"
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        <label htmlFor="remember" className="text-foreground">{t.rememberMe}</label>
                      </div>
                      <a href="/forgot-password" className="text-primary transition-colors hover:text-primary-700">
                        {t.forgotPassword}
                      </a>
                    </div>

                    <Button
                      type="submit"
                      className="flex h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-700 font-medium text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          {t.loggingIn}
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          {t.login}
                        </>
                      )}
                    </Button>

                    {oauthButtons("login")}

                    {/* Solo mostrar credenciales de prueba en desarrollo */}
                    {import.meta.env.DEV && (
                      <div className="mt-6 rounded-xl border border-primary/20 bg-muted p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                          <p className="text-sm font-medium text-foreground">{t.demoCredentials}:</p>
                        </div>
                        <div className="space-y-1">
                          <p className="rounded bg-background/60 px-2 py-1 font-mono text-xs text-foreground">
                            📧 juan.sanchez@example.com
                          </p>
                          <p className="rounded bg-background/60 px-2 py-1 font-mono text-xs text-foreground">
                            🔒 password123
                          </p>
                        </div>
                      </div>
                    )}
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="mt-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <User className="h-4 w-4 text-primary" />
                          {t.firstName}
                        </Label>
                        <div className="relative">
                          <Input
                            id="firstName"
                            placeholder={language === 'es' ? 'Tu nombre' : 'First name'}
                            value={registerData.firstName}
                            onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                            className={inputClass}
                            required
                          />
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <User className="h-4 w-4 text-primary" />
                          {t.lastName}
                        </Label>
                        <div className="relative">
                          <Input
                            id="lastName"
                            placeholder={language === 'es' ? 'Tu apellido' : 'Last name'}
                            value={registerData.lastName}
                            onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                            className={inputClass}
                            required
                          />
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username" className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <User className="h-4 w-4 text-primary" />
                        {t.username}
                      </Label>
                      <div className="relative">
                        <Input
                          id="username"
                          placeholder={language === 'es' ? 'Elige un nombre de usuario' : 'Choose a username'}
                          value={registerData.username}
                          onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                          className={inputClass}
                          required
                        />
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Phone className="h-4 w-4 text-primary" />
                        {language === 'es' ? 'Teléfono (opcional)' : 'Phone (optional)'}
                      </Label>
                      <div className="relative">
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 234 567 8900"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                          className={inputClass}
                        />
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registerEmail" className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Mail className="h-4 w-4 text-primary" />
                        {t.email}
                      </Label>
                      <div className="relative">
                        <Input
                          id="registerEmail"
                          type="email"
                          placeholder="tu@email.com"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          className={inputClass}
                          required
                        />
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registerPassword" className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Lock className="h-4 w-4 text-primary" />
                        {t.password}
                      </Label>
                      <div className="relative">
                        <PasswordInput
                          id="registerPassword"
                          placeholder={language === 'es' ? 'Mínimo 8 caracteres' : 'At least 8 characters'}
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          className={inputClass}
                          required
                        />
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        id="terms"
                        className="rounded border-input text-primary focus:ring-primary"
                        required
                      />
                      <label htmlFor="terms" className="text-foreground">
                        {language === 'es' ? 'Acepto los' : 'I accept the'}{' '}
                        <a href="#" className="text-primary transition-colors hover:text-primary-700">
                          {language === 'es' ? 'términos y condiciones' : 'terms and conditions'}
                        </a>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      className="flex h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-accent to-accent-600 font-medium text-accent-foreground shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          {t.registering}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          {t.signup}
                        </>
                      )}
                    </Button>

                    {oauthButtons("register")}
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
