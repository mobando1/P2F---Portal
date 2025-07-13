import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { login, register } from "@/lib/auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
      setLocation("/dashboard");
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
      setLocation("/dashboard");
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
        {/* Logo y mensaje de bienvenida */}
        <div className="text-center mb-8">
          <img 
            src="/attached_assets/a1c5a1_9514ede9e3124d7a9adf78f5dcf07f28~mv2_1752436886046.png" 
            alt="Passport2Fluency" 
            className="h-16 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-[#0A4A6E] mb-2">¡Bienvenido!</h1>
          <p className="text-[#0A4A6E]/70 text-lg">Tu camino hacia la fluidez en español comienza aquí</p>
        </div>

        <Card className="shadow-xl border-0 backdrop-blur-sm bg-white/95">
          <CardContent className="p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#F8F9FA] p-1 rounded-xl">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-[#1C7BB1] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-medium"
                >
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="data-[state=active]:bg-[#1C7BB1] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-medium"
                >
                  Registrarse
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[#0A4A6E] font-medium text-sm">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[#0A4A6E] font-medium text-sm">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Tu contraseña"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300"
                      required
                    />
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
                    className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white font-medium h-12 transition-all duration-300 shadow-lg hover:shadow-xl" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                  
                  <div className="mt-4 p-3 bg-[#EAF4FA] rounded-lg border border-[#1C7BB1]/20">
                    <p className="text-sm font-medium text-[#0A4A6E] mb-2">Credenciales de Prueba:</p>
                    <p className="text-xs text-[#0A4A6E]">Email: juan.sanchez@example.com</p>
                    <p className="text-xs text-[#0A4A6E]">Contraseña: password123</p>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-[#0A4A6E] font-medium text-sm">Nombre</Label>
                      <Input
                        id="firstName"
                        placeholder="Tu nombre"
                        value={registerData.firstName}
                        onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                        className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-[#0A4A6E] font-medium text-sm">Apellido</Label>
                      <Input
                        id="lastName"
                        placeholder="Tu apellido"
                        value={registerData.lastName}
                        onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                        className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-[#0A4A6E] font-medium text-sm">Nombre de usuario</Label>
                    <Input
                      id="username"
                      placeholder="Elige un nombre de usuario"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registerEmail" className="text-[#0A4A6E] font-medium text-sm">Correo Electrónico</Label>
                    <Input
                      id="registerEmail"
                      type="email"
                      placeholder="tu@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword" className="text-[#0A4A6E] font-medium text-sm">Contraseña</Label>
                    <Input
                      id="registerPassword"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20 h-12 text-base transition-all duration-300"
                      required
                    />
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
                    className="w-full bg-[#F59E1C] hover:bg-[#F59E1C]/90 text-white font-medium h-12 transition-all duration-300 shadow-lg hover:shadow-xl" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Registrando..." : "Registrarse"}
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
