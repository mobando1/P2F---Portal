import { useState } from "react";
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Crown, Star } from "lucide-react";
import Header from "@/components/header";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

const CheckoutForm = ({ planType, amount }: { planType: string; amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: `Successfully upgraded to ${planType} plan!`,
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? "Processing..." : `Pay $${amount}`}
      </Button>
    </form>
  );
};

const SubscriptionCheckout = ({ planType, onBack }: { planType: string; onBack: () => void }) => {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const user = getCurrentUser();

  const plans = {
    basic: { name: "Basic", amount: 19.99, classes: 4 },
    premium: { name: "Premium", amount: 49.99, classes: 12 },
    unlimited: { name: "Unlimited", amount: 99.99, classes: "Unlimited" }
  };

  const selectedPlan = plans[planType as keyof typeof plans];

  const handleCreatePayment = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/create-subscription", {
        userId: user.id,
        planType,
        email: user.email
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Error creating payment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Confirm Your Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">{selectedPlan.name} Plan</h3>
            <p className="text-2xl font-bold text-primary">${selectedPlan.amount}/month</p>
            <p className="text-gray-600">{selectedPlan.classes} classes per month</p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleCreatePayment} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Setting up payment..." : "Continue to Payment"}
            </Button>
            <Button variant="outline" onClick={onBack} className="w-full">
              Back to Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm planType={selectedPlan.name} amount={selectedPlan.amount} />
        </Elements>
        <Button variant="outline" onClick={onBack} className="w-full mt-4">
          Back to Plans
        </Button>
      </CardContent>
    </Card>
  );
};

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: 19.99,
      classes: 4,
      features: [
        "4 classes per month",
        "Access to basic tutors",
        "Standard scheduling",
        "Email support"
      ],
      popular: false,
      icon: <CheckCircle className="h-6 w-6 text-blue-500" />
    },
    {
      id: "premium",
      name: "Premium",
      price: 49.99,
      classes: 12,
      features: [
        "12 classes per month",
        "Access to all tutors",
        "Priority scheduling",
        "Video library access",
        "Progress tracking",
        "24/7 chat support"
      ],
      popular: true,
      icon: <Star className="h-6 w-6 text-orange-500" />
    },
    {
      id: "unlimited",
      name: "Unlimited",
      price: 99.99,
      classes: "Unlimited",
      features: [
        "Unlimited classes",
        "Premium tutor selection",
        "Flexible scheduling",
        "Full video library",
        "Advanced analytics",
        "Personal learning plan",
        "Priority support"
      ],
      popular: false,
      icon: <Crown className="h-6 w-6 text-purple-500" />
    }
  ];

  if (selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SubscriptionCheckout 
            planType={selectedPlan} 
            onBack={() => setSelectedPlan(null)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Learning Plan
          </h1>
          <p className="text-xl text-gray-600">
            Start your language learning journey with Passport2Fluency
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'ring-2 ring-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-gray-600 mt-2">
                  {typeof plan.classes === 'number' 
                    ? `${plan.classes} classes per month` 
                    : 'Unlimited classes'
                  }
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full mt-6 ${
                    plan.popular 
                      ? 'bg-primary hover:bg-primary/90' 
                      : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Why Choose Passport2Fluency?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Expert Tutors</h3>
              <p className="text-gray-600">
                Learn from certified native speakers with years of teaching experience
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Flexible Scheduling</h3>
              <p className="text-gray-600">
                Book classes that fit your schedule with our easy-to-use calendar system
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Progress Tracking</h3>
              <p className="text-gray-600">
                Monitor your improvement with detailed analytics and personalized feedback
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}