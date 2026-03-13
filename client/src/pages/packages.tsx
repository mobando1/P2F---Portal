import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Star, Clock, Users, Shield, Zap, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/lib/currency";
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
  const [activeTab, setActiveTab] = useState<"subscriptions" | "packages">("subscriptions");
  const { formatPrice } = useCurrency();

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 1,
      name: 'Starter Flow',
      type: 'weekly',
      classesIncluded: 4,
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
      classesIncluded: 8,
      price: 219.99,
      discountPercent: 18,
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
      classesIncluded: 12,
      price: 299.99,
      discountPercent: 25,
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
        toast({ title: "Error", description: "Please login first", variant: "destructive" });
        setIsProcessing(false);
        return;
      }
      const stripeLinks: Record<number, string> = {
        1: 'https://buy.stripe.com/28E7sMfti4jFdYMbKCes00b',
        2: 'https://buy.stripe.com/3cIfZi80Q6rN07WaGyes00c',
        3: 'https://buy.stripe.com/cNidRa0yo8zVbQE01Ues00d'
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
      toast({ title: "Payment Error", description: "Could not access payment. Please try again.", variant: "destructive" });
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
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, userId: currentUser.id }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      if (data.url) {
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
    <div className="min-h-screen bg-[#F8F9FA]">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#0A4A6E] via-[#1C7BB1] to-[#0A4A6E] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#F59E1C] rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              {language === 'es' ? 'Planes Diseñados para Tu Éxito' : 'Plans Designed for Your Success'}
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              {language === 'es'
                ? 'Elige la frecuencia ideal y comienza a hablar inglés con confianza'
                : 'Choose the ideal frequency and start speaking English with confidence'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                <Users className="w-4 h-4" />
                {language === 'es' ? 'Profesores nativos' : 'Native teachers'}
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                <Clock className="w-4 h-4" />
                {language === 'es' ? 'Horarios 24/7' : '24/7 scheduling'}
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                <Shield className="w-4 h-4" />
                {language === 'es' ? 'Garantía 30 días' : '30-day guarantee'}
              </span>
            </div>
            {/* Social proof */}
            <div className="mt-6 flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-5 h-5 text-[#F59E1C] fill-[#F59E1C]" />
              ))}
              <span className="ml-2 text-white/90 text-sm font-medium">
                4.9/5 — 5,000+ {language === 'es' ? 'estudiantes' : 'students'}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-16">
        {/* Tab Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-white rounded-full p-1.5 shadow-lg border border-gray-100">
            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === "subscriptions"
                  ? "bg-[#0A4A6E] text-white shadow-md"
                  : "text-[#0A4A6E]/60 hover:text-[#0A4A6E]"
              }`}
            >
              {language === 'es' ? 'Planes Mensuales' : 'Monthly Plans'}
            </button>
            <button
              onClick={() => setActiveTab("packages")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === "packages"
                  ? "bg-[#0A4A6E] text-white shadow-md"
                  : "text-[#0A4A6E]/60 hover:text-[#0A4A6E]"
              }`}
            >
              {language === 'es' ? 'Paquetes de Clases' : 'Class Packages'}
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        {activeTab === "subscriptions" && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
          >
            {subscriptionPlans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={plan.popular ? "md:-mt-4 md:mb-4" : ""}
              >
                <Card className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow ${
                  plan.popular
                    ? 'ring-2 ring-[#F59E1C] shadow-xl'
                    : 'border border-gray-100'
                }`}>
                  {/* Popular ribbon */}
                  {plan.popular && (
                    <div className="bg-gradient-to-r from-[#F59E1C] to-[#e08a0e] text-white text-center py-2 text-sm font-bold tracking-wide">
                      {language === 'es' ? 'MAS POPULAR' : 'MOST POPULAR'}
                    </div>
                  )}
                  <CardContent className={`p-8 ${plan.popular ? '' : 'pt-10'}`}>
                    {/* Plan name */}
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold text-[#0A4A6E] mb-1">{plan.name}</h3>
                      <p className="text-sm text-[#0A4A6E]/50">
                        {plan.classesIncluded} {language === 'es' ? 'clases/mes' : 'classes/mo'}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="text-center mb-6">
                      <p className="text-4xl font-extrabold text-[#0A4A6E]">
                        {formatPrice(plan.price)}
                      </p>
                      <p className="text-sm text-[#0A4A6E]/50 mt-1">
                        {language === 'es' ? 'por mes' : 'per month'}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="text-xs text-[#0A4A6E]/40">
                          {formatPrice(plan.price / (plan.classesIncluded || 1))} {language === 'es' ? '/ clase' : '/ class'}
                        </span>
                        {plan.discountPercent > 0 && (
                          <Badge className="bg-[#F59E1C]/10 text-[#F59E1C] border-0 text-xs font-bold hover:bg-[#F59E1C]/10">
                            -{plan.discountPercent}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100 mb-6" />

                    {/* Features */}
                    <div className="space-y-3 mb-8">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-[#1C7BB1]" />
                          </div>
                          <span className="text-sm text-[#0A4A6E]/70">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button
                      className={`w-full h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                        plan.popular
                          ? 'bg-[#F59E1C] hover:bg-[#e08a0e] text-white shadow-lg shadow-[#F59E1C]/25'
                          : 'bg-[#0A4A6E] hover:bg-[#1C7BB1] text-white'
                      }`}
                      onClick={() => handleSubscriptionPurchase(plan)}
                      disabled={isProcessing}
                    >
                      {isProcessing && selectedPlan?.id === plan.id ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          {language === 'es' ? 'Procesando...' : 'Processing...'}
                        </>
                      ) : (
                        <>
                          {plan.popular
                            ? (language === 'es' ? 'Elegir Este Plan' : 'Choose This Plan')
                            : (language === 'es' ? 'Comenzar Ahora' : 'Start Now')
                          }
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Class Packages */}
        {activeTab === "packages" && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
          >
            {classPackages.map((pkg) => (
              <motion.div
                key={pkg.id}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={pkg.popular ? "md:-mt-4 md:mb-4" : ""}
              >
                <Card className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow ${
                  pkg.popular
                    ? 'ring-2 ring-[#1C7BB1] shadow-xl'
                    : 'border border-gray-100'
                }`}>
                  {pkg.popular && (
                    <div className="bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] text-white text-center py-2 text-sm font-bold tracking-wide">
                      {language === 'es' ? 'MEJOR VALOR' : 'BEST VALUE'}
                    </div>
                  )}
                  <CardContent className={`p-8 ${pkg.popular ? '' : 'pt-10'}`}>
                    {/* Class count - focal point */}
                    <div className="text-center mb-6">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 ${
                        pkg.popular
                          ? 'bg-[#1C7BB1]/10'
                          : 'bg-[#EAF4FA]'
                      }`}>
                        <span className="text-2xl font-extrabold text-[#1C7BB1]">{pkg.classCount}</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#0A4A6E]">{pkg.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="text-center mb-6">
                      <p className="text-4xl font-extrabold text-[#0A4A6E]">
                        {formatPrice(pkg.price)}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="text-xs text-[#0A4A6E]/40">
                          {formatPrice(pkg.perClassPrice)} {language === 'es' ? '/ clase' : '/ class'}
                        </span>
                        {pkg.discountPercent > 0 && (
                          <Badge className="bg-[#F59E1C]/10 text-[#F59E1C] border-0 text-xs font-bold hover:bg-[#F59E1C]/10">
                            -{pkg.discountPercent}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100 mb-6" />

                    {/* Features */}
                    <div className="space-y-3 mb-8">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#1C7BB1]" />
                        </div>
                        <span className="text-sm text-[#0A4A6E]/70">
                          {pkg.classCount} {language === 'es' ? 'clases individuales (60 min)' : 'individual classes (60 min)'}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#1C7BB1]" />
                        </div>
                        <span className="text-sm text-[#0A4A6E]/70">
                          {language === 'es' ? 'Válido por 6 meses' : 'Valid for 6 months'}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#1C7BB1]" />
                        </div>
                        <span className="text-sm text-[#0A4A6E]/70">
                          {language === 'es' ? 'Horarios flexibles' : 'Flexible schedules'}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#1C7BB1]" />
                        </div>
                        <span className="text-sm text-[#0A4A6E]/70">
                          {language === 'es' ? 'Sin expiración mensual' : 'No monthly expiration'}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      className={`w-full h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                        pkg.popular
                          ? 'bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white shadow-lg shadow-[#1C7BB1]/25'
                          : 'bg-[#0A4A6E] hover:bg-[#1C7BB1] text-white'
                      }`}
                      onClick={() => handlePackagePurchase(pkg)}
                      disabled={isProcessing}
                    >
                      {isProcessing && selectedPackage?.id === pkg.id ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Value Props - Compact strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16"
        >
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-[#0A4A6E] text-center mb-8">
              {language === 'es' ? '¿Por qué elegir Passport2Fluency?' : 'Why choose Passport2Fluency?'}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-[#1C7BB1]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A4A6E] mb-1">
                    {language === 'es' ? 'Profesores Nativos' : 'Native Teachers'}
                  </h3>
                  <p className="text-sm text-[#0A4A6E]/60">
                    {language === 'es'
                      ? 'Certificados y con experiencia comprobada'
                      : 'Certified with proven experience'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#F59E1C]/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-[#F59E1C]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A4A6E] mb-1">
                    {language === 'es' ? 'Garantía 30 Días' : '30-Day Guarantee'}
                  </h3>
                  <p className="text-sm text-[#0A4A6E]/60">
                    {language === 'es'
                      ? 'Si no estás satisfecho, te devolvemos tu dinero'
                      : 'Not satisfied? We refund your money'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1C7BB1]/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-[#1C7BB1]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A4A6E] mb-1">
                    {language === 'es' ? 'Horarios Flexibles' : 'Flexible Schedules'}
                  </h3>
                  <p className="text-sm text-[#0A4A6E]/60">
                    {language === 'es'
                      ? 'Reserva clases 24/7, adapta a tu vida'
                      : 'Book classes 24/7, adapt to your life'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Guarantee Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-6 px-8 py-4 bg-[#EAF4FA] rounded-full">
            <div className="flex items-center gap-2 text-sm text-[#0A4A6E]">
              <Shield className="w-4 h-4 text-[#1C7BB1]" />
              <span>{language === 'es' ? 'Garantía de 30 días' : '30-day guarantee'}</span>
            </div>
            <div className="w-px h-4 bg-[#1C7BB1]/20 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm text-[#0A4A6E]">
              <Check className="w-4 h-4 text-[#1C7BB1]" />
              <span>{language === 'es' ? 'Cancela cuando quieras' : 'Cancel anytime'}</span>
            </div>
            <div className="w-px h-4 bg-[#1C7BB1]/20 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm text-[#0A4A6E]">
              <Clock className="w-4 h-4 text-[#1C7BB1]" />
              <span>{language === 'es' ? 'Soporte 24/7' : '24/7 support'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
