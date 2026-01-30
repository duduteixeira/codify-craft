import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Subscription = Tables<"user_subscriptions">;

export interface PlanLimits {
  activities: number;
  generations: number;
  deploys: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { activities: 3, generations: 10, deploys: 5 },
  pro: { activities: 50, generations: 500, deploys: 100 },
  enterprise: { activities: -1, generations: -1, deploys: -1 }, // -1 = unlimited
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getPlanLimits = (): PlanLimits => {
    return PLAN_LIMITS[subscription?.plan || "free"];
  };

  const canCreateActivity = (): boolean => {
    const limits = getPlanLimits();
    if (limits.activities === -1) return true;
    return (subscription?.custom_activities_count || 0) < limits.activities;
  };

  const canGenerateAI = (): boolean => {
    const limits = getPlanLimits();
    if (limits.generations === -1) return true;
    return (subscription?.ai_generations_count || 0) < limits.generations;
  };

  const getRemainingActivities = (): number | "∞" => {
    const limits = getPlanLimits();
    if (limits.activities === -1) return "∞";
    return Math.max(0, limits.activities - (subscription?.custom_activities_count || 0));
  };

  const getRemainingGenerations = (): number | "∞" => {
    const limits = getPlanLimits();
    if (limits.generations === -1) return "∞";
    return Math.max(0, limits.generations - (subscription?.ai_generations_count || 0));
  };

  const incrementActivityCount = async () => {
    if (!subscription) return;
    
    await supabase
      .from("user_subscriptions")
      .update({
        custom_activities_count: (subscription.custom_activities_count || 0) + 1,
      })
      .eq("id", subscription.id);
    
    await loadSubscription();
  };

  const incrementGenerationCount = async () => {
    if (!subscription) return;
    
    await supabase
      .from("user_subscriptions")
      .update({
        ai_generations_count: (subscription.ai_generations_count || 0) + 1,
      })
      .eq("id", subscription.id);
    
    await loadSubscription();
  };

  return {
    subscription,
    loading,
    refresh: loadSubscription,
    getPlanLimits,
    canCreateActivity,
    canGenerateAI,
    getRemainingActivities,
    getRemainingGenerations,
    incrementActivityCount,
    incrementGenerationCount,
  };
}
