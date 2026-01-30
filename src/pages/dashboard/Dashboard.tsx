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
} from "lucide-react";

// Mock data
const stats = [
  { label: "Total Activities", value: "12", icon: Zap, change: "+2 this week" },
  { label: "Active Deployments", value: "8", icon: Rocket, change: "100% uptime" },
  { label: "AI Generations", value: "47", icon: Activity, change: "53 remaining" },
  { label: "Git Commits", value: "156", icon: GitBranch, change: "+12 today" },
];

const recentActivities = [
  {
    id: "1",
    name: "Slack Notifier",
    status: "deployed",
    lastUpdated: "2 hours ago",
    provider: "Vercel",
  },
  {
    id: "2",
    name: "HubSpot Sync",
    status: "generating",
    lastUpdated: "5 minutes ago",
    provider: "-",
  },
  {
    id: "3",
    name: "Twilio SMS",
    status: "deployed",
    lastUpdated: "1 day ago",
    provider: "Railway",
  },
  {
    id: "4",
    name: "Zendesk Ticket Creator",
    status: "draft",
    lastUpdated: "3 days ago",
    provider: "-",
  },
];

const getStatusBadge = (status: string) => {
  const styles = {
    deployed: "status-deployed",
    generating: "status-generating",
    draft: "status-draft",
    failed: "status-failed",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[status as keyof typeof styles] || styles.draft
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const Dashboard = () => {
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
          <div className="divide-y divide-border">
            {recentActivities.map((activity) => (
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
                      <span>{activity.lastUpdated}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {activity.provider}
                  </span>
                  {getStatusBadge(activity.status)}
                </div>
              </Link>
            ))}
          </div>
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
            to="/dashboard/settings"
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
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
