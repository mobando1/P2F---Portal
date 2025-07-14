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
      // Buscar en paquetes de clases
      const packageMatch = classPackages.find(pkg => 
        pkg.name.toLowerCase().includes(planParam.toLowerCase()) || 
        pkg.classCount.toString() === planParam
      );
      if (packageMatch) {
        setSelectedPackage(packageMatch);
      }
    }
  }, []);

  // Datos de ejemplo - en producción vendrían de la API
  const classPackages: ClassPackage[] = [
    {
      id: 1,
      name: t.language === 'es' ? '5 Clases' : '5 Classes',
      classCount: 5,
      price: 75,
      discountPercent: 0,
      perClassPrice: 15,
    },
    {
      id: 2,
      name: t.language === 'es' ? '10 Clases' : '10 Classes',
      classCount: 10,
      price: 140,
      discountPercent: 10,
      perClassPrice: 14,
      popular: true,
    },
    {
      id: 3,
      name: t.language === 'es' ? '20 Clases' : '20 Classes',
      classCount: 20,
      price: 260,
      discountPercent: 15,
      perClassPrice: 13,
    },
    {
      id: 4,
      name: t.language === 'es' ? '30 Clases' : '30 Classes',
      classCount: 30,
      price: 360,
      discountPercent: 20,
      perClassPrice: 12,
    },
  ];

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 1,
      name: t.language === 'es' ? 'Básico' : 'Basic',
      type: 'monthly',
      classesIncluded: 4,
      price: 49,
      discountPercent: 0,
      features: [
        t.language === 'es' ? '4 clases por mes' : '4 classes per month',
        t.language === 'es' ? 'Acceso a materiales' : 'Access to materials',
        t.language === 'es' ? 'Soporte básico' : 'Basic support',
      ],
    },
    {
      id: 2,
      name: t.language === 'es' ? 'Premium' : 'Premium',
      type: 'monthly',
      classesIncluded: 8,
      price: 89,
      discountPercent: 10,
      features: [
        t.language === 'es' ? '8 clases por mes' : '8 classes per month',
        t.language === 'es' ? 'Acceso completo a materiales' : 'Full access to materials',
        t.language === 'es' ? 'Soporte prioritario' : 'Priority support',
        t.language === 'es' ? 'Clases de conversación grupales' : 'Group conversation classes',
      ],
      popular: true,
    },
    {
      id: 3,
      name: t.language === 'es' ? 'Ilimitado' : 'Unlimited',
      type: 'monthly',
      classesIncluded: null,
      price: 149,
      discountPercent: 15,
      features: [
        t.language === 'es' ? 'Clases ilimitadas' : 'Unlimited classes',
        t.language === 'es' ? 'Acceso VIP a materiales' : 'VIP access to materials',
        t.language === 'es' ? 'Soporte 24/7' : '24/7 support',
        t.language === 'es' ? 'Clases grupales ilimitadas' : 'Unlimited group classes',
        t.language === 'es' ? 'Sesiones de coaching' : 'Coaching sessions',
      ],
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