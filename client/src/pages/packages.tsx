import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CreditCard, Calendar, Star, Clock, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";

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
  const { t } = useLanguage();
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
        t.language === 'es' ? 'Progreso constante' : 'Steady progress',
        t.language === 'es' ? 'Sesiones privadas 1-a-1 (60 min)' : 'Private 1-on-1 sessions (60 min)',
        t.language === 'es' ? 'Programación flexible' : 'Flexible scheduling',
        t.language === 'es' ? 'Cancela en cualquier momento' : 'Cancel anytime',
        t.language === 'es' ? 'Soporte del profesor' : 'Teacher support',
        t.language === 'es' ? 'Sin contrato' : 'No contract'
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
        t.language === 'es' ? 'Progreso más rápido' : 'Faster progress',
        t.language === 'es' ? 'Mejora conversacional semanal' : 'Weekly conversational improvement',
        t.language === 'es' ? 'Sesiones privadas 1-a-1 (60 min)' : 'Private 1-on-1 sessions (60 min)',
        t.language === 'es' ? 'Programación flexible' : 'Flexible scheduling',
        t.language === 'es' ? 'Cancela en cualquier momento' : 'Cancel anytime',
        t.language === 'es' ? 'Soporte del profesor' : 'Teacher support',
        t.language === 'es' ? 'Sin contrato' : 'No contract'
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
        t.language === 'es' ? 'Para estudiantes serios que quieren resultados rápidos' : 'For serious learners who want results fast',
        t.language === 'es' ? 'Sesiones privadas 1-a-1 (60 min)' : 'Private 1-on-1 sessions (60 min)',
        t.language === 'es' ? 'Programación flexible' : 'Flexible scheduling',
        t.language === 'es' ? 'Cancela en cualquier momento' : 'Cancel anytime',
        t.language === 'es' ? 'Soporte del profesor' : 'Teacher support',
        t.language === 'es' ? 'Sin contrato' : 'No contract'
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
      name: t.language === 'es' ? 'Paquete de 5 Clases' : '5-Class Package',
      classCount: 5,
      price: 149.95,
      discountPercent: 0,
      perClassPrice: 29.99,
    },
    {
      id: 2,
      name: t.language === 'es' ? 'Paquete de 10 Clases' : '10-Class Package',
      classCount: 10,
      price: 274.90,
      discountPercent: 8,
      perClassPrice: 27.49,
      popular: true,
    },
    {
      id: 3,
      name: t.language === 'es' ? 'Paquete de 20 Clases' : '20-Class Package',
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
      // Obtener el usuario actual del localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser.id) {
        throw new Error('Usuario no encontrado');
      }

      // Crear PaymentIntent para paquete de clases
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        amount: packageItem.price,
        metadata: {
          type: 'package',
          packageId: packageItem.id,
          packageName: packageItem.name,
          classCount: packageItem.classCount,
          userId: currentUser.id
        }
      });

      const data = await response.json();
      
      if (data.clientSecret) {
        // Redirigir a página de checkout con el clientSecret
        window.location.href = `/checkout?client_secret=${data.clientSecret}&type=package&id=${packageItem.id}`;
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: t.language === 'es' ? "Error de Pago" : "Payment Error",
        description: t.language === 'es' ? "No se pudo procesar el pago. Intenta de nuevo." : "Could not process payment. Please try again.",
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
      // Obtener el usuario actual del localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser.id) {
        throw new Error('Usuario no encontrado');
      }

      // Crear suscripción en Stripe
      const response = await apiRequest("POST", "/api/create-subscription", {
        planId: plan.id,
        userId: currentUser.id
      });

      const data = await response.json();
      
      if (data.clientSecret) {
        // Redirigir a página de suscripción con el clientSecret
        window.location.href = `/subscribe?client_secret=${data.clientSecret}&plan_id=${plan.id}`;
      } else if (data.subscriptionId) {
        // Si no hay clientSecret pero sí subscriptionId, la suscripción ya está activa
        toast({
          title: t.language === 'es' ? "Suscripción Creada" : "Subscription Created",
          description: t.language === 'es' ? "Tu suscripción ha sido activada exitosamente." : "Your subscription has been activated successfully.",
        });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        throw new Error('No client secret or subscription ID received');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: t.language === 'es' ? "Error de Suscripción" : "Subscription Error",
        description: t.language === 'es' ? "No se pudo crear la suscripción. Intenta de nuevo." : "Could not create subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section ACTUALIZADO */}
        <div className="text-center mb-12 bg-gradient-to-r from-[#F59E1C] to-[#F59E1C]/80 text-white rounded-xl p-8">
          <h1 className="text-5xl font-bold mb-4">
            {t.language === 'es' ? '🚀 ¡NUEVO! Planes Optimizados para Tu Éxito' : '🚀 NEW! Optimized Plans for Your Success'}
          </h1>
          <p className="text-2xl mb-8 opacity-90">
            {t.language === 'es' 
              ? 'Ahora con garantía de 30 días y profesores nativos certificados'
              : 'Now with 30-day guarantee and certified native teachers'
            }
          </p>
          <div className="flex items-center justify-center gap-6 text-lg">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-white" />
              <span className="font-semibold">{t.language === 'es' ? 'Profesores nativos' : 'Native teachers'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-white" />
              <span className="font-semibold">{t.language === 'es' ? 'Horarios 24/7' : '24/7 schedules'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-white" />
              <span className="font-semibold">{t.language === 'es' ? 'Garantía 30 días' : '30-day guarantee'}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="subscriptions">
              {t.language === 'es' ? 'Planes Mensuales' : 'Monthly Plans'}
            </TabsTrigger>
            <TabsTrigger value="packages">
              {t.language === 'es' ? 'Paquetes de Clases' : 'Class Packages'}
            </TabsTrigger>
          </TabsList>

          {/* Paquetes de Clases */}
          <TabsContent value="packages">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#0A4A6E] mb-2">
                {t.language === 'es' ? 'Paquetes de Clases' : 'Class Packages'}
              </h2>
              <p className="text-[#0A4A6E]/70">
                {t.language === 'es' 
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
                      {t.language === 'es' ? 'Más Popular' : 'Most Popular'}
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-[#0A4A6E]">{pkg.name}</CardTitle>
                    <CardDescription>
                      <div className="text-3xl font-bold text-[#1C7BB1] mb-2">
                        ${pkg.price}
                      </div>
                      <div className="text-sm text-[#0A4A6E]/60">
                        ${pkg.perClassPrice} {t.language === 'es' ? 'por clase' : 'per class'}
                      </div>
                      {pkg.discountPercent > 0 && (
                        <Badge variant="secondary" className="mt-2">
                          {pkg.discountPercent}% {t.language === 'es' ? 'descuento' : 'off'}
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1C7BB1]" />
                        <span className="text-sm">{pkg.classCount} {t.language === 'es' ? 'clases individuales' : 'individual classes'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1C7BB1]" />
                        <span className="text-sm">{t.language === 'es' ? 'Válido por 6 meses' : 'Valid for 6 months'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1C7BB1]" />
                        <span className="text-sm">{t.language === 'es' ? 'Horarios flexibles' : 'Flexible schedules'}</span>
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
                          {t.language === 'es' ? 'Procesando...' : 'Processing...'}
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          {t.language === 'es' ? 'Comprar Ahora' : 'Buy Now'}
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
                {t.language === 'es' ? 'Planes Mensuales' : 'Monthly Plans'}
              </h2>
              <p className="text-[#0A4A6E]/70">
                {t.language === 'es' 
                  ? 'Elige la frecuencia que mejor se adapte a tu estilo de vida'
                  : 'Choose the frequency that best fits your lifestyle'
                }
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => (
                <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-[#F59E1C] scale-105' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#F59E1C] text-white">
                      {t.language === 'es' ? 'MÁS POPULAR' : 'MOST POPULAR'}
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-[#0A4A6E] text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <div className="text-4xl font-bold text-[#1C7BB1] mb-2">
                        ${plan.price}
                      </div>
                      <div className="text-lg text-[#0A4A6E]/80 mb-1">
                        {t.language === 'es' ? 'Por Mes' : 'Per Month'}
                      </div>
                      <div className="text-sm text-[#0A4A6E]/60">
                        ${(plan.price / plan.classesIncluded).toFixed(2)} {t.language === 'es' ? 'por clase' : 'per class'}
                      </div>
                      {plan.discountPercent > 0 && (
                        <Badge variant="secondary" className="mt-2 bg-[#F59E1C]/20 text-[#F59E1C]">
                          {plan.discountPercent}% {t.language === 'es' ? 'descuento' : 'off'}
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
                          {t.language === 'es' ? 'Creando suscripción...' : 'Creating subscription...'}
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          {plan.popular 
                            ? (t.language === 'es' ? 'Elegir Este Plan' : 'Choose This Plan')
                            : (t.language === 'es' ? 'Comenzar Ahora' : 'Start Learning Now')
                          }
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Nueva sección de valor agregado */}
        <div className="bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] text-white rounded-lg p-8 mb-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              {t.language === 'es' ? '¿Por qué elegir Passport2Fluency?' : 'Why Choose Passport2Fluency?'}
            </h2>
            <p className="text-xl mb-8 opacity-90">
              {t.language === 'es' 
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
                  {t.language === 'es' ? 'Profesores Nativos' : 'Native Teachers'}
                </h3>
                <p className="opacity-90">
                  {t.language === 'es' 
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
                  {t.language === 'es' ? 'Garantía 30 Días' : '30-Day Guarantee'}
                </h3>
                <p className="opacity-90">
                  {t.language === 'es' 
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
                  {t.language === 'es' ? 'Horarios Flexibles' : 'Flexible Schedules'}
                </h3>
                <p className="opacity-90">
                  {t.language === 'es' 
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
                4.9/5 {t.language === 'es' ? 'estrellas' : 'stars'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-16 text-center">
          <Card className="bg-white border-[#1C7BB1]/20">
            <CardContent className="py-8">
              <h3 className="text-2xl font-bold text-[#0A4A6E] mb-4">
                {t.language === 'es' ? 'Garantía de Satisfacción' : 'Satisfaction Guarantee'}
              </h3>
              <p className="text-[#0A4A6E]/70 mb-6">
                {t.language === 'es' 
                  ? 'Si no estás completamente satisfecho con tu primera clase, te devolvemos el dinero.'
                  : 'If you\'re not completely satisfied with your first class, we\'ll refund your money.'
                }
              </p>
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#1C7BB1]" />
                  <span className="text-sm text-[#0A4A6E]">
                    {t.language === 'es' ? 'Garantía de 30 días' : '30-day guarantee'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#1C7BB1]" />
                  <span className="text-sm text-[#0A4A6E]">
                    {t.language === 'es' ? 'Cancela cuando quieras' : 'Cancel anytime'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#1C7BB1]" />
                  <span className="text-sm text-[#0A4A6E]">
                    {t.language === 'es' ? 'Soporte 24/7' : '24/7 support'}
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