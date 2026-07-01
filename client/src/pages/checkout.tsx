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

// Initialize Stripe - usar claves de testing para pruebas
const stripePublicKey = import.meta.env.TESTING_VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY;
if (!stripePublicKey) {
  throw new Error('Missing required Stripe key: TESTING_VITE_STRIPE_PUBLIC_KEY or VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(stripePublicKey);

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
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!clientSecret || !packageInfo) {
    return (
      <div className="min-h-screen bg-muted">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Card>
            <CardContent className="py-12">
              <h1 className="text-2xl font-bold text-foreground mb-4">
                {language === 'es' ? 'Sesión Expirada' : 'Session Expired'}
              </h1>
              <p className="text-muted-foreground mb-6">
                {language === 'es' 
                  ? 'La sesión de pago ha expirado. Por favor, regresa a la página de planes.'
                  : 'The payment session has expired. Please return to the plans page.'
                }
              </p>
              <Link href="/packages">
                <Button className="bg-primary hover:bg-primary-900">
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
    <div className="min-h-screen bg-muted">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/packages">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Volver a Planes' : 'Back to Plans'}
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">
                {language === 'es' ? 'Resumen del Pedido' : 'Order Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">{packageInfo.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {packageInfo.classCount} {language === 'es' ? 'clases individuales' : 'individual classes'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${packageInfo.perClassPrice} {language === 'es' ? 'por clase' : 'per class'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      ${packageInfo.price}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">
                      {language === 'es' ? 'Total' : 'Total'}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      ${packageInfo.price}
                    </span>
                  </div>
                </div>

                <div className="bg-accent/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">
                    {language === 'es' ? '✓ Lo que obtienes:' : '✓ What you get:'}
                  </h4>
                  <ul className="text-sm text-foreground/80 space-y-1">
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
              <CardTitle className="text-foreground">
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
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">
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
            <div className="text-center text-sm text-muted-foreground">
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