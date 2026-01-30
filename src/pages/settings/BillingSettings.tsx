import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CreditCard, Zap, Sparkles, CheckCircle } from "lucide-react";

const plans = [
  {
    name: "Free",
    value: "free",
    price: "$0",
    activities: 3,
    generations: 10,
    features: ["3 Custom Activities", "10 AI generations/month", "Community support"],
  },
  {
    name: "Pro",
    value: "pro",
    price: "$29",
    activities: 50,
    generations: 500,
    features: ["50 Custom Activities", "500 AI generations/month", "Priority support", "Git integration", "Multi-provider deploy"],
  },
  {
    name: "Enterprise",
    value: "enterprise",
    price: "Custom",
    activities: -1,
    generations: -1,
    features: ["Unlimited Activities", "Unlimited AI generations", "Dedicated support", "SSO", "Custom integrations"],
  },
];

const BillingSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = plans.find(p => p.value === subscription?.plan) || plans[0];
  const activitiesUsed = subscription?.custom_activities_count || 0;
  const generationsUsed = subscription?.ai_generations_count || 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view usage.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold mb-1">Current Plan</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{currentPlan.name}</span>
                    <Badge variant="secondary">{currentPlan.price}/month</Badge>
                  </div>
                </div>
                <Button variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              </div>

              {/* Usage Stats */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Custom Activities</span>
                    <span className="font-medium">
                      {activitiesUsed} / {currentPlan.activities === -1 ? "∞" : currentPlan.activities}
                    </span>
                  </div>
                  <Progress 
                    value={currentPlan.activities === -1 ? 0 : (activitiesUsed / currentPlan.activities) * 100} 
                    className="h-2" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">AI Generations</span>
                    <span className="font-medium">
                      {generationsUsed} / {currentPlan.generations === -1 ? "∞" : currentPlan.generations}
                    </span>
                  </div>
                  <Progress 
                    value={currentPlan.generations === -1 ? 0 : (generationsUsed / currentPlan.generations) * 100} 
                    className="h-2" 
                  />
                </div>
              </div>
            </div>

            {/* Available Plans */}
            <div>
              <h3 className="font-semibold mb-4">Available Plans</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.value}
                    className={`rounded-xl border p-6 ${
                      plan.value === subscription?.plan
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {plan.value === "pro" ? (
                        <Zap className="h-5 w-5 text-primary" />
                      ) : plan.value === "enterprise" ? (
                        <Sparkles className="h-5 w-5 text-primary" />
                      ) : null}
                      <h4 className="font-semibold">{plan.name}</h4>
                      {plan.value === subscription?.plan && (
                        <Badge variant="secondary" className="ml-auto">Current</Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold mb-4">
                      {plan.price}
                      {plan.price !== "Custom" && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.value === subscription?.plan ? "outline" : "default"}
                      className="w-full"
                      disabled={plan.value === subscription?.plan}
                    >
                      {plan.value === subscription?.plan ? "Current Plan" : plan.value === "enterprise" ? "Contact Sales" : "Upgrade"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BillingSettings;
