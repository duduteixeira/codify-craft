import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type Activity = Tables<"custom_activities">;

export function useActivities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("custom_activities")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error loading activities:", error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [user]);

  const deleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from("custom_activities")
        .delete()
        .eq("id", activityId);

      if (error) throw error;

      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      toast({ title: "Activity deleted" });
      return true;
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
      return false;
    }
  };

  const duplicateActivity = async (activityId: string) => {
    if (!user) return null;

    try {
      const original = activities.find((a) => a.id === activityId);
      if (!original) throw new Error("Activity not found");

      const { data, error } = await supabase
        .from("custom_activities")
        .insert({
          user_id: user.id,
          name: `${original.name} (Copy)`,
          description: original.description,
          original_prompt: original.original_prompt,
          extracted_requirements: original.extracted_requirements,
          config_json: original.config_json,
          nodejs_code: original.nodejs_code,
          javascript_code: original.javascript_code,
          selected_version: original.selected_version,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      setActivities((prev) => [data, ...prev]);
      toast({ title: "Activity duplicated" });
      return data;
    } catch (error) {
      console.error("Error duplicating activity:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate activity",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    activities,
    loading,
    refresh: loadActivities,
    deleteActivity,
    duplicateActivity,
  };
}
