import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Check, Loader2 } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/header";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe - usar claves de testing para pruebas
const stripePublicKey = import.meta.env.TESTING_VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY;
if (!stripePublicKey) {
  throw new Error('Missing required Stripe key: TESTING_VITE_STRIPE_PUBLIC_KEY or VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(stripePublicKey);

// Subscription Form Component
function SubscriptionForm({ planInfo }: { planInfo: any }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard?subscription=success`,
        },
      });

      if (error) {
        toast({
          title: language === 'es' ? "Error en la Suscripción" : "Subscription Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: language === 'es' ? "Error en la Suscripción" : "Subscription Failed",
        description: language === 'es' ? "Ocurrió un error inesperado" : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        options={{
          layout: "tabs"
        }}
      />
      <Button 
        type="submit" 
        disabled={!stripe || !elements || isLoading}
        className={`w-full text-white ${planInfo.popular 
          ? 'bg-[#F59E1C] hover:bg-[#F59E1C]/90' 
          : 'bg-[#1C7BB1] hover:bg-[#0A4A6E]'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {language === 'es' ? 'Procesando...' : 'Processing...'}
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Suscribirse Ahora' : 'Subscribe Now'} • ${planInfo.price}/mes
          </>
        )}
      </Button>
    </form>
  );
}

export default function SubscribePage() {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<any>(null);

  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const secret = urlParams.get('client_secret');
    const planId = urlParams.get('plan_id');

    if (secret) {
      setClientSecret(secret);
      
      // Set plan info based on planId
      if (planId) {
        const plan = getPlanById(parseInt(planId));
        setPlanInfo(plan);
      }
    }
    
    setIsLoading(false);
  }, []);

  const getPlanById = (id: number) => {
    const plans = [
      {
        id: 1,
        name: language === 'es' ? '1 Clase por Semana' : '1 Class per Week',
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
        name: language === 'es' ? '2 Clases por Semana' : '2 Classes per Week',
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
        name: language === 'es' ? '3 Clases por Semana' : '3 Classes per Week',
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
    
    return plans.find(p => p.id === id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EAF4FA] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1C7BB1] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!clientSecret || !planInfo) {
    return (
      <div className="min-h-screen bg-[#EAF4FA]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Card>
            <CardContent className="py-12">
              <h1 className="text-2xl font-bold text-[#0A4A6E] mb-4">
                {language === 'es' ? 'Sesión Expirada' : 'Session Expired'}
              </h1>
              <p className="text-gray-600 mb-6">
                {language === 'es' 
                  ? 'La sesión de pago ha expirado. Por favor, regresa a la página de planes.'
                  : 'The payment session has expired. Please return to the plans page.'
                }
              </p>
              <Link href="/packages">
                <Button className="bg-[#1C7BB1] hover:bg-[#0A4A6E]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Volver a Planes' : 'Back to Plans'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/packages">
            <Button variant="outline" className="border-[#1C7BB1] text-[#1C7BB1] hover:bg-[#1C7BB1] hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Volver a Planes' : 'Back to Plans'}
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <Card className={planInfo.popular ? 'ring-2 ring-[#F59E1C]' : ''}>
            <CardHeader>
              <CardTitle className="text-[#0A4A6E] flex items-center">
                {planInfo.name}
                {planInfo.popular && (
                  <span className="ml-2 bg-[#F59E1C] text-white text-xs px-2 py-1 rounded-full">
                    {language === 'es' ? 'MÁS POPULAR' : 'MOST POPULAR'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#1C7BB1] mb-2">
                    ${planInfo.price}
                  </div>
                  <div className="text-lg text-[#0A4A6E]/80 mb-1">
                    {language === 'es' ? 'Por Mes' : 'Per Month'}
                  </div>
                  <div className="text-sm text-[#0A4A6E]/60">
                    ${(planInfo.price / planInfo.classesIncluded).toFixed(2)} {language === 'es' ? 'por clase' : 'per class'}
                  </div>
                  {planInfo.discountPercent > 0 && (
                    <div className="mt-2 bg-[#F59E1C]/20 text-[#F59E1C] text-sm px-2 py-1 rounded-full inline-block">
                      {planInfo.discountPercent}% {language === 'es' ? 'descuento' : 'off'}
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-[#0A4A6E] mb-3">
                    {language === 'es' ? 'Incluido en tu plan:' : 'Included in your plan:'}
                  </h4>
                  <div className="space-y-2">
                    {planInfo.features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[#1C7BB1] mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-[#0A4A6E]/80">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1C7BB1]/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#0A4A6E] mb-2">
                    {language === 'es' ? '✓ Garantía de Satisfacción' : '✓ Satisfaction Guarantee'}
                  </h4>
                  <p className="text-sm text-[#0A4A6E]/80">
                    {language === 'es' 
                      ? 'Si no estás satisfecho en los primeros 30 días, te devolvemos tu dinero.'
                      : 'If not satisfied within the first 30 days, we\'ll refund your money.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0A4A6E]">
                <CreditCard className="w-5 h-5 mr-2 inline" />
                {language === 'es' ? 'Información de Pago' : 'Payment Information'}
              </CardTitle>
              <CardDescription>
                {language === 'es' 
                  ? 'Completa tu suscripción de forma segura'
                  : 'Complete your subscription securely'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SubscriptionForm planInfo={planInfo} />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-[#1C7BB1] border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-600">
                    {language === 'es' 
                      ? 'Preparando formulario de suscripción...'
                      : 'Preparing subscription form...'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <Card className="mt-8">
          <CardContent className="py-6">
            <div className="text-center text-sm text-gray-600">
              <p>
                {language === 'es' 
                  ? '🔒 Pago seguro procesado por Stripe. Tu información está protegida con encriptación de nivel bancario.'
                  : '🔒 Secure payment processed by Stripe. Your information is protected with bank-level encryption.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}