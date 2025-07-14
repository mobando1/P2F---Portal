import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CreditCard, Calendar, Star, Clock } from "lucide-react";
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
  const [selectedPackage, setSelectedPackage] = useState<ClassPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  
  // Detectar plan preseleccionado desde URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    if (planParam) {
      // Buscar en planes de suscripción
      let planMatch = null;
      
      // Mapear parámetros de URL a planes
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
  }, [subscriptionPlans]);

  // Planes de suscripción basados en tu sitio web actual
  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 1,
      name: t.language === 'es' ? '1 Clase por Semana' : '1 Class per Week',
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
      name: t.language === 'es' ? '2 Clases por Semana' : '2 Classes per Week',
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
      name: t.language === 'es' ? '3 Clases por Semana' : '3 Classes per Week',
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

  const handlePackagePurchase = (packageItem: ClassPackage) => {
    setSelectedPackage(packageItem);
    // Aquí iría la lógica de Stripe para comprar paquetes
    console.log('Comprando paquete:', packageItem);
  };

  const handleSubscriptionPurchase = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    // Aquí iría la lógica de Stripe para suscripciones
    console.log('Suscribiéndose a:', plan);
  };

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#0A4A6E] mb-4">
            {t.language === 'es' ? 'Elige tu Plan Perfecto' : 'Choose Your Perfect Plan'}
          </h1>
          <p className="text-xl text-[#0A4A6E]/70 mb-8">
            {t.language === 'es' 
              ? 'Compra clases individuales o suscríbete para obtener mejores precios'
              : 'Buy individual classes or subscribe for better prices'
            }
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-[#0A4A6E]/60">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[#F59E1C]" />
              <span>{t.language === 'es' ? 'Profesores certificados' : 'Certified teachers'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#F59E1C]" />
              <span>{t.language === 'es' ? 'Horarios flexibles' : 'Flexible schedules'}</span>
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="w-4 h-4 text-[#F59E1C]" />
              <span>{t.language === 'es' ? 'Pago seguro' : 'Secure payment'}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="packages" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="packages">
              {t.language === 'es' ? 'Paquetes de Clases' : 'Class Packages'}
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              {t.language === 'es' ? 'Suscripciones' : 'Subscriptions'}
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
                  ? 'Compra clases individuales sin compromiso mensual'
                  : 'Buy individual classes without monthly commitment'
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
                      className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E]"
                      onClick={() => handlePackagePurchase(pkg)}
                    >
                      {t.language === 'es' ? 'Comprar Ahora' : 'Buy Now'}
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
                {t.language === 'es' ? 'Planes de Suscripción' : 'Subscription Plans'}
              </h2>
              <p className="text-[#0A4A6E]/70">
                {t.language === 'es' 
                  ? 'Suscríbete mensualmente y obtén mejores precios'
                  : 'Subscribe monthly and get better prices'
                }
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => (
                <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-[#1C7BB1]' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#F59E1C] text-white">
                      {t.language === 'es' ? 'Más Popular' : 'Most Popular'}
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-[#0A4A6E]">{plan.name}</CardTitle>
                    <CardDescription>
                      <div className="text-3xl font-bold text-[#1C7BB1] mb-2">
                        ${plan.price}
                        <span className="text-sm text-[#0A4A6E]/60">
                          /{t.language === 'es' ? 'mes' : 'month'}
                        </span>
                      </div>
                      {plan.discountPercent > 0 && (
                        <Badge variant="secondary" className="mt-2">
                          {plan.discountPercent}% {t.language === 'es' ? 'descuento' : 'off'}
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#1C7BB1]" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button 
                      className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E]"
                      onClick={() => handleSubscriptionPurchase(plan)}
                    >
                      {t.language === 'es' ? 'Suscribirme' : 'Subscribe'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Sección de Garantía */}
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