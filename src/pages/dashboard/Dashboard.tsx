import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Plus,
  Zap,
  GitBranch,
  Rocket,
  Activity,
  ArrowUpRight,
  Clock,
  Loader2,
} from "lucide-react";

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    deployed: "status-deployed",
    generating: "status-generating",
    generated: "status-generated",
    draft: "status-draft",
    failed: "status-failed",
    deploying: "status-generating",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[status] || styles.draft
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [gitIntegrations, setGitIntegrations] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [activitiesRes, subRes, gitRes] = await Promise.all([
        supabase
          .from("custom_activities")
          .select("*")
          .eq("user_id", user?.id)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", user?.id)
          .maybeSingle(),
        supabase
          .from("git_integrations")
          .select("*")
          .eq("user_id", user?.id),
      ]);

      setActivities(activitiesRes.data || []);
      setSubscription(subRes.data);
      setGitIntegrations(gitRes.data || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const maxActivities = subscription?.plan === "pro" ? 50 : subscription?.plan === "enterprise" ? Infinity : 3;
  const maxGenerations = subscription?.plan === "pro" ? 500 : subscription?.plan === "enterprise" ? Infinity : 10;

  const stats = [
    { 
      label: "Total Activities", 
      value: subscription?.custom_activities_count?.toString() || "0", 
      icon: Zap, 
      change: `${maxActivities === Infinity ? "Unlimited" : `${maxActivities - (subscription?.custom_activities_count || 0)} remaining`}` 
    },
    { 
      label: "Active Deployments", 
      value: activities.filter(a => a.status === "deployed").length.toString(), 
      icon: Rocket, 
      change: "Real-time status" 
    },
    { 
      label: "AI Generations", 
      value: subscription?.ai_generations_count?.toString() || "0", 
      icon: Activity, 
      change: `${maxGenerations === Infinity ? "Unlimited" : `${maxGenerations - (subscription?.ai_generations_count || 0)} remaining`}` 
    },
    { 
      label: "Git Connections", 
      value: gitIntegrations.length.toString(), 
      icon: GitBranch, 
      change: gitIntegrations.length > 0 ? "Connected" : "Not connected" 
    },
  ];

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your activities.
            </p>
          </div>
          <Button variant="gradient" asChild>
            <Link to="/dashboard/activities/new">
              <Plus className="h-4 w-4 mr-2" />
              New Activity
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-6 rounded-xl bg-card border border-border card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xs text-primary">{stat.change}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activities */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Recent Activities</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/activities">View all</Link>
                </Button>
              </div>
              {activities.length === 0 ? (
                <div className="p-8 text-center">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No activities yet</p>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard/activities/new">Create your first activity</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activities.map((activity) => (
                    <Link
                      key={activity.id}
                      to={`/dashboard/activities/${activity.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeAgo(activity.updated_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(activity.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/dashboard/activities/new"
                className="p-6 rounded-xl border border-border bg-card card-hover group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">
                      Create with AI
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Generate a new activity from description
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/dashboard/git"
                className="p-6 rounded-xl border border-border bg-card card-hover group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <GitBranch className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">
                      Connect Git
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Link your GitHub, GitLab, or Bitbucket
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/dashboard/settings/deploy"
                className="p-6 rounded-xl border border-border bg-card card-hover group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Rocket className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">
                      Deploy Settings
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Configure deployment providers
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
