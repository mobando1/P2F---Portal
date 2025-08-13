import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/header";

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
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#1C7BB1]/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-[#1C7BB1]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0A4A6E] mb-2">
                  {language === 'es' ? 'Integración de Stripe' : 'Stripe Integration'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {language === 'es' 
                    ? 'El formulario de pago seguro de Stripe se integrará aquí'
                    : 'Stripe secure payment form will be integrated here'
                  }
                </p>
                <Button className="bg-[#1C7BB1] hover:bg-[#0A4A6E]">
                  {language === 'es' ? 'Completar Pago' : 'Complete Payment'}
                </Button>
              </div>
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