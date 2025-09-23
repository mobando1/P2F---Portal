import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Loader2 } from "lucide-react";
import type { Subscription } from "@shared/schema";

// Extended subscription type with plan details
interface SubscriptionWithPlan extends Subscription {
  planName?: string;
  planType?: string;
  price?: number;
  classesLimit?: number;
  classesUsed?: number;
}

interface SubscriptionCardProps {
  subscription: SubscriptionWithPlan;
  onUpgrade: () => void;
  onManage: () => void;
  isManaging?: boolean;
}

export default function SubscriptionCard({ subscription, onUpgrade, onManage, isManaging = false }: SubscriptionCardProps) {
  const usagePercentage = subscription.classesLimit && subscription.classesUsed
    ? (subscription.classesUsed / subscription.classesLimit) * 100 
    : 0;

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getPlanIcon = () => {
    switch (subscription.planType) {
      case 'premium':
      case 'unlimited':
        return <Crown className="text-primary text-2xl" />;
      default:
        return <div className="w-6 h-6 bg-primary/20 rounded"></div>;
    }
  };

  const getPlanDescription = () => {
    switch (subscription.planType) {
      case 'unlimited':
        return "Unlimited classes per month";
      case 'premium':
        return "Premium features included";
      case 'basic':
        return "Essential learning features";
      default:
        return "Access to platform features";
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <CardTitle>Your Plan</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {getPlanIcon()}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900">{subscription.planName}</h3>
          <p className="text-gray-600 text-sm">{getPlanDescription()}</p>
          
          {subscription.classesLimit && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Classes used</span>
                <span className="text-sm font-medium text-gray-900">
                  {subscription.classesUsed} / {subscription.classesLimit}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <p>
              Next billing: <span className="font-medium">{formatDate(subscription.nextBillingDate)}</span>
            </p>
            <p>
              Amount: <span className="font-medium">${subscription.price}/month</span>
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <Button
              className="w-full"
              onClick={onUpgrade}
            >
              Upgrade Plan
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={onManage}
              disabled={isManaging}
            >
              {isManaging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening Portal...
                </>
              ) : (
                "Manage Subscription"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
