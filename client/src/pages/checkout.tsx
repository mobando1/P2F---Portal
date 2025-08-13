import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/header";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Payment Form Component
function PaymentForm({ packageInfo }: { packageInfo: any }) {
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
          return_url: `${window.location.origin}/dashboard?payment=success`,
        },
      });

      if (error) {
        toast({
          title: language === 'es' ? "Error en el Pago" : "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: language === 'es' ? "Error en el Pago" : "Payment Failed",
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
        className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {language === 'es' ? 'Procesando...' : 'Processing...'}
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Completar Pago' : 'Complete Payment'} • ${packageInfo.price}
          </>
        )}
      </Button>
    </form>
  );
}

export default function CheckoutPage() {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [packageInfo, setPackageInfo] = useState<any>(null);

  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const secret = urlParams.get('client_secret');
    const type = urlParams.get('type');
    const id = urlParams.get('id');

    if (secret) {
      setClientSecret(secret);
      
      // Set package info based on type and id
      if (type === 'package' && id) {
        const packageData = getPackageById(parseInt(id));
        setPackageInfo(packageData);
      }
    }
    
    setIsLoading(false);
  }, []);

  const getPackageById = (id: number) => {
    const packages = [
      {
        id: 1,
        name: language === 'es' ? 'Paquete de 5 Clases' : '5-Class Package',
        classCount: 5,
        price: 149.95,
        perClassPrice: 29.99,
      },
      {
        id: 2,
        name: language === 'es' ? 'Paquete de 10 Clases' : '10-Class Package',
        classCount: 10,
        price: 274.90,
        perClassPrice: 27.49,
      },
      {
        id: 3,
        name: language === 'es' ? 'Paquete de 20 Clases' : '20-Class Package',
        classCount: 20,
        price: 499.80,
        perClassPrice: 24.99,
      },
    ];
    
    return packages.find(p => p.id === id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EAF4FA] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1C7BB1] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!clientSecret || !packageInfo) {
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
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0A4A6E]">
                {language === 'es' ? 'Resumen del Pedido' : 'Order Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#0A4A6E]">{packageInfo.name}</h3>
                    <p className="text-sm text-gray-600">
                      {packageInfo.classCount} {language === 'es' ? 'clases individuales' : 'individual classes'}
                    </p>
                    <p className="text-sm text-gray-600">
                      ${packageInfo.perClassPrice} {language === 'es' ? 'por clase' : 'per class'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#1C7BB1]">
                      ${packageInfo.price}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0A4A6E]">
                      {language === 'es' ? 'Total' : 'Total'}
                    </span>
                    <span className="text-2xl font-bold text-[#1C7BB1]">
                      ${packageInfo.price}
                    </span>
                  </div>
                </div>

                <div className="bg-[#F59E1C]/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#0A4A6E] mb-2">
                    {language === 'es' ? '✓ Lo que obtienes:' : '✓ What you get:'}
                  </h4>
                  <ul className="text-sm text-[#0A4A6E]/80 space-y-1">
                    <li>• {packageInfo.classCount} {language === 'es' ? 'clases privadas 1-a-1' : 'private 1-on-1 classes'}</li>
                    <li>• {language === 'es' ? 'Válido por 6 meses' : 'Valid for 6 months'}</li>
                    <li>• {language === 'es' ? 'Horarios flexibles' : 'Flexible scheduling'}</li>
                    <li>• {language === 'es' ? 'Profesores nativos certificados' : 'Certified native teachers'}</li>
                    <li>• {language === 'es' ? 'Soporte 24/7' : '24/7 support'}</li>
                  </ul>
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
                  ? 'Completa tu compra de forma segura'
                  : 'Complete your purchase securely'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm packageInfo={packageInfo} />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-[#1C7BB1] border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-600">
                    {language === 'es' 
                      ? 'Preparando formulario de pago...'
                      : 'Preparing payment form...'
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