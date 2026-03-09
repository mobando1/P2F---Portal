import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CreditCard, Calendar, Star, Clock, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { fadeInUp, staggerContainer } from "@/lib/animations";

interface ClassPackage {
  id: number;
  name: string;
  classCount: number;
  price: number;
  discountPercent: number;
  perClassPrice: number;
  popular?: boolean;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  type: string;
  classesIncluded: number | null;
  price: number;
  discountPercent: number;
  features: string[];
  popular?: boolean;
}

export default function PackagesPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<ClassPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Planes de suscripción basados en tu sitio web actual
  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 1,
      name: 'Starter Flow',
      type: 'weekly',
      classesIncluded: 4, // ~4 clases por mes
      price: 119.96,
      discountPercent: 0,
      features: [
        language === 'es' ? 'Progreso constante' : 'Steady progress',
        language === 'es' ? 'Sesiones privadas 1-a-1 (60 min)' : 'Private 1-on-1 sessions (60 min)',
        language === 'es' ? 'Programación flexible' : 'Flexible scheduling',
        language === 'es' ? 'Cancela en cualquier momento' : 'Cancel anytime',
        language === 'es' ? 'Soporte del profesor' : 'Teacher support',
        language === 'es' ? 'Sin contrato' : 'No contract'
      ],
    },
    {
      id: 2,
      name: 'Momentum Plan',
      type: 'weekly',
      classesIncluded: 8, // ~8 clases por mes
      price: 219.99,
      discountPercent: 18, // vs 2 × $119.96
      features: [
        language === 'es' ? 'Progreso más rápido' : 'Faster progress',
        language === 'es' ? 'Mejora conversacional semanal' : 'Weekly conversational improvement',
        language === 'es' ? 'Sesiones privadas 1-a-1 (60 min)' : 'Private 1-on-1 sessions (60 min)',
        language === 'es' ? 'Programación flexible' : 'Flexible scheduling',
        language === 'es' ? 'Cancela en cualquier momento' : 'Cancel anytime',
        language === 'es' ? 'Soporte del profesor' : 'Teacher support',
        language === 'es' ? 'Sin contrato' : 'No contract'
      ],
      popular: true,
    },
    {
      id: 3,
      name: 'Fluency Boost',
      type: 'weekly',
      classesIncluded: 12, // ~12 clases por mes
      price: 299.99,
      discountPercent: 25, // vs 3 × $119.96
      features: [
        language === 'es' ? 'Para estudiantes serios que quieren resultados rápidos' : 'For serious learners who want results fast',
        language === 'es' ? 'Sesiones privadas 1-a-1 (60 min)' : 'Private 1-on-1 sessions (60 min)',
        language === 'es' ? 'Programación flexible' : 'Flexible scheduling',
        language === 'es' ? 'Cancela en cualquier momento' : 'Cancel anytime',
        language === 'es' ? 'Soporte del profesor' : 'Teacher support',
        language === 'es' ? 'Sin contrato' : 'No contract'
      ],
    },
  ];

  // Detectar plan preseleccionado desde URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    if (planParam) {
      let planMatch = null;
      
      if (planParam === '1-class' || planParam === '1') {
        planMatch = subscriptionPlans.find(p => p.id === 1);
      } else if (planParam === '2-class' || planParam === '2') {
        planMatch = subscriptionPlans.find(p => p.id === 2);
      } else if (planParam === '3-class' || planParam === '3') {
        planMatch = subscriptionPlans.find(p => p.id === 3);
      }
      
      if (planMatch) {
        setSelectedPlan(planMatch);
      }
    }
  }, []);

  // Mantener paquetes de clases como opción adicional
  const classPackages: ClassPackage[] = [
    {
      id: 1,
      name: language === 'es' ? 'Paquete de 5 Clases' : '5-Class Package',
      classCount: 5,
      price: 149.95,
      discountPercent: 0,
      perClassPrice: 29.99,
    },
    {
      id: 2,
      name: language === 'es' ? 'Paquete de 10 Clases' : '10-Class Package',
      classCount: 10,
      price: 274.90,
      discountPercent: 8,
      perClassPrice: 27.49,
      popular: true,
    },
    {
      id: 3,
      name: language === 'es' ? 'Paquete de 20 Clases' : '20-Class Package',
      classCount: 20,
      price: 499.80,
      discountPercent: 17,
      perClassPrice: 24.99,
    },
  ];

  const handlePackagePurchase = async (packageItem: ClassPackage) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setSelectedPackage(packageItem);

    try {
      const currentUser = getCurrentUser();

      if (!currentUser || !currentUser.id) {
        toast({
          title: "Error",
          description: "Please login first",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Enlaces directos de Stripe para cada paquete
      const stripeLinks: Record<number, string> = {
        1: 'https://buy.stripe.com/28E7sMfti4jFdYMbKCes00b', // 5 clases
        2: 'https://buy.stripe.com/3cIfZi80Q6rN07WaGyes00c', // 10 clases
        3: 'https://buy.stripe.com/cNidRa0yo8zVbQE01Ues00d'  // 20 clases
      };

      const link = stripeLinks[packageItem.id];

      if (link) {
        const url = new URL(link);
        url.searchParams.set('client_reference_id', currentUser.id.toString());
        url.searchParams.set('prefilled_email', currentUser.email || '');
        window.location.href = url.toString();
      } else {
        throw new Error('Package not configured');
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "Could not access payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscriptionPurchase = async (plan: SubscriptionPlan) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setSelectedPlan(plan);
    
    try {
      const currentUser = getCurrentUser();

      if (!currentUser || !currentUser.id) {
        toast({ title: "Error", description: "Please log in to purchase a plan", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      // Crear sesión de checkout en Stripe
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          userId: currentUser.id
        }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.url) {
        // Redirigir directamente al checkout de Stripe
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: language === 'es' ? "Error de Pago" : "Payment Error",
        description: language === 'es' ? "No se pudo abrir el checkout. Intenta de nuevo." : "Could not open checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section ACTUALIZADO */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 bg-gradient-to-r from-[#F59E1C] to-[#F59E1C]/80 text-white rounded-xl p-8"
        >
          <h1 className="text-5xl font-bold mb-4">
            {language === 'es' ? '🚀 ¡NUEVO! Planes Optimizados para Tu Éxito' : '🚀 NEW! Optimized Plans for Your Success'}
          </h1>
          <p className="text-2xl mb-8 opacity-90">
            {language === 'es' 
              ? 'Ahora con garantía de 30 días y profesores nativos certificados'
              : 'Now with 30-day guarantee and certified native teachers'
            }
          </p>
          <div className="flex items-center justify-center gap-6 text-lg">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-white" />
              <span className="font-semibold">{language === 'es' ? 'Profesores nativos' : 'Native teachers'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-white" />
              <span className="font-semibold">{language === 'es' ? 'Horarios 24/7' : '24/7 schedules'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-white" />
              <span className="font-semibold">{language === 'es' ? 'Garantía 30 días' : '30-day guarantee'}</span>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="subscriptions">
              {language === 'es' ? 'Planes Mensuales' : 'Monthly Plans'}
            </TabsTrigger>
            <TabsTrigger value="packages">
              {language === 'es' ? 'Paquetes de Clases' : 'Class Packages'}
            </TabsTrigger>
          </TabsList>

          {/* Paquetes de Clases */}
          <TabsContent value="packages">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#0A4A6E] mb-2">
                {language === 'es' ? 'Paquetes de Clases' : 'Class Packages'}
              </h2>
              <p className="text-[#0A4A6E]/70">
                {language === 'es' 
                  ? 'Para estudiantes que prefieren flexibilidad total'
                  : 'For students who prefer complete flexibility'
                }
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {classPackages.map((pkg) => (
                <Card key={pkg.id} className={`relative ${pkg.popular ? 'ring-2 ring-[#1C7BB1]' : ''}`}>
                  {pkg.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#F59E1C] text-white">
                      {language === 'es' ? 'Más Popular' : 'Most Popular'}
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-[#0A4A6E]">{pkg.name}</CardTitle>
                    <CardDescription>
                      <div className="text-3xl font-bold text-[#1C7BB1] mb-2">
                        ${pkg.price}
                      </div>
                      <div className="text-sm text-[#0A4A6E]/60">
                        ${pkg.perClassPrice} {language === 'es' ? 'por clase' : 'per class'}
                      </div>
                      {pkg.discountPercent > 0 && (
                        <Badge variant="secondary" className="mt-2">
                          {pkg.discountPercent}% {language === 'es' ? 'descuento' : 'off'}
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1C7BB1]" />
                        <span className="text-sm">{pkg.classCount} {language === 'es' ? 'clases individuales' : 'individual classes'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1C7BB1]" />
                        <span className="text-sm">{language === 'es' ? 'Válido por 6 meses' : 'Valid for 6 months'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1C7BB1]" />
                        <span className="text-sm">{language === 'es' ? 'Horarios flexibles' : 'Flexible schedules'}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E] disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handlePackagePurchase(pkg)}
                      disabled={isProcessing}
                    >
                      {isProcessing && selectedPackage?.id === pkg.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          {language === 'es' ? 'Procesando...' : 'Processing...'}
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          {language === 'es' ? 'Comprar Ahora' : 'Buy Now'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Suscripciones */}
          <TabsContent value="subscriptions">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#0A4A6E] mb-2">
                {language === 'es' ? 'Planes Mensuales' : 'Monthly Plans'}
              </h2>
              <p className="text-[#0A4A6E]/70">
                {language === 'es' 
                  ? 'Elige la frecuencia que mejor se adapte a tu estilo de vida'
                  : 'Choose the frequency that best fits your lifestyle'
                }
              </p>
            </div>
            
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => (
                <motion.div key={plan.id} variants={fadeInUp} whileHover={{ y: -6, boxShadow: "0 20px 50px rgba(28, 123, 177, 0.12)" }} transition={{ duration: 0.25 }}>
                <Card className={`relative ${plan.popular ? 'ring-2 ring-[#F59E1C] scale-105' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#F59E1C] text-white">
                      {language === 'es' ? 'MÁS POPULAR' : 'MOST POPULAR'}
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-[#0A4A6E] text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <div className="text-4xl font-bold text-[#1C7BB1] mb-2">
                        ${plan.price}
                      </div>
                      <div className="text-lg text-[#0A4A6E]/80 mb-1">
                        {language === 'es' ? 'Por Mes' : 'Per Month'}
                      </div>
                      <div className="text-sm text-[#0A4A6E]/60">
                        ${(plan.price / (plan.classesIncluded || 0)).toFixed(2)} {language === 'es' ? 'por clase' : 'per class'}
                      </div>
                      {plan.discountPercent > 0 && (
                        <Badge variant="secondary" className="mt-2 bg-[#F59E1C]/20 text-[#F59E1C]">
                          {plan.discountPercent}% {language === 'es' ? 'descuento' : 'off'}
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-[#1C7BB1] mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#0A4A6E]/80">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button 
                      className={`w-full disabled:opacity-50 disabled:cursor-not-allowed ${plan.popular 
                        ? 'bg-[#F59E1C] hover:bg-[#F59E1C]/90 text-white' 
                        : 'bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white'
                      }`}
                      onClick={() => handleSubscriptionPurchase(plan)}
                      disabled={isProcessing}
                    >
                      {isProcessing && selectedPlan?.id === plan.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          {language === 'es' ? 'Creando suscripción...' : 'Creating subscription...'}
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          {plan.popular 
                            ? (language === 'es' ? 'Elegir Este Plan' : 'Choose This Plan')
                            : (language === 'es' ? 'Comenzar Ahora' : 'Start Learning Now')
                          }
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Nueva sección de valor agregado */}
        <div className="bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] text-white rounded-lg p-8 mb-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              {language === 'es' ? '¿Por qué elegir Passport2Fluency?' : 'Why Choose Passport2Fluency?'}
            </h2>
            <p className="text-xl mb-8 opacity-90">
              {language === 'es' 
                ? 'Únete a más de 5,000 estudiantes que han logrado la fluidez'
                : 'Join over 5,000 students who have achieved fluency'
              }
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'es' ? 'Profesores Nativos' : 'Native Teachers'}
                </h3>
                <p className="opacity-90">
                  {language === 'es' 
                    ? 'Certificados y con experiencia comprobada'
                    : 'Certified with proven experience'
                  }
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'es' ? 'Garantía 30 Días' : '30-Day Guarantee'}
                </h3>
                <p className="opacity-90">
                  {language === 'es' 
                    ? 'Si no estás satisfecho, te devolvemos tu dinero'
                    : 'If not satisfied, we refund your money'
                  }
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'es' ? 'Horarios Flexibles' : 'Flexible Schedules'}
                </h3>
                <p className="opacity-90">
                  {language === 'es' 
                    ? 'Reserva clases 24/7, adapta a tu vida'
                    : 'Book classes 24/7, adapt to your life'
                  }
                </p>
              </div>
            </div>

            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 text-[#F59E1C] fill-current" />
              ))}
              <span className="ml-2 text-lg font-semibold">
                4.9/5 {language === 'es' ? 'estrellas' : 'stars'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-16 text-center">
          <Card className="bg-white border-[#1C7BB1]/20">
            <CardContent className="py-8">
              <h3 className="text-2xl font-bold text-[#0A4A6E] mb-4">
                {language === 'es' ? 'Garantía de Satisfacción' : 'Satisfaction Guarantee'}
              </h3>
              <p className="text-[#0A4A6E]/70 mb-6">
                {language === 'es' 
                  ? 'Si no estás completamente satisfecho con tu primera clase, te devolvemos el dinero.'
                  : 'If you\'re not completely satisfied with your first class, we\'ll refund your money.'
                }
              </p>
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#1C7BB1]" />
                  <span className="text-sm text-[#0A4A6E]">
                    {language === 'es' ? 'Garantía de 30 días' : '30-day guarantee'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#1C7BB1]" />
                  <span className="text-sm text-[#0A4A6E]">
                    {language === 'es' ? 'Cancela cuando quieras' : 'Cancel anytime'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#1C7BB1]" />
                  <span className="text-sm text-[#0A4A6E]">
                    {language === 'es' ? 'Soporte 24/7' : '24/7 support'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}