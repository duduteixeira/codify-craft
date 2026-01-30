import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Filter,
  Zap,
  Clock,
  MoreVertical,
  ExternalLink,
  Trash2,
  Edit,
  Copy,
} from "lucide-react";

// Mock data
const activities = [
  {
    id: "1",
    name: "Slack Notifier",
    description: "Send customer data to Slack channel when entering journey",
    status: "deployed",
    version: "nodejs",
    provider: "Vercel",
    url: "https://slack-notifier.vercel.app",
    createdAt: "2024-01-15",
    updatedAt: "2 hours ago",
  },
  {
    id: "2",
    name: "HubSpot Contact Sync",
    description: "Sync contact information bidirectionally with HubSpot CRM",
    status: "generating",
    version: "nodejs",
    provider: null,
    url: null,
    createdAt: "2024-01-20",
    updatedAt: "5 minutes ago",
  },
  {
    id: "3",
    name: "Twilio SMS Sender",
    description: "Send personalized SMS messages via Twilio API",
    status: "deployed",
    version: "javascript",
    provider: "Railway",
    url: "https://twilio-sms.railway.app",
    createdAt: "2024-01-10",
    updatedAt: "1 day ago",
  },
  {
    id: "4",
    name: "Zendesk Ticket Creator",
    description: "Create support tickets in Zendesk from journey data",
    status: "draft",
    version: "nodejs",
    provider: null,
    url: null,
    createdAt: "2024-01-18",
    updatedAt: "3 days ago",
  },
  {
    id: "5",
    name: "Google Sheets Logger",
    description: "Log journey events to Google Sheets for analysis",
    status: "deployed",
    version: "javascript",
    provider: "Vercel",
    url: "https://sheets-logger.vercel.app",
    createdAt: "2024-01-05",
    updatedAt: "5 days ago",
  },
  {
    id: "6",
    name: "Webhook Forwarder",
    description: "Forward journey data to custom webhook endpoints",
    status: "failed",
    version: "nodejs",
    provider: "Render",
    url: null,
    createdAt: "2024-01-12",
    updatedAt: "2 days ago",
  },
];

const statusFilters = ["all", "deployed", "generating", "draft", "failed"];

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

const Activities = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || activity.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Activities</h1>
            <p className="text-muted-foreground">
              Manage your Custom Activities
            </p>
          </div>
          <Button variant="gradient" asChild>
            <Link to="/dashboard/activities/new">
              <Plus className="h-4 w-4 mr-2" />
              New Activity
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="relative rounded-xl border border-border bg-card p-5 card-hover group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Link
                      to={`/dashboard/activities/${activity.id}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {activity.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {activity.version === "nodejs" ? "Node.js" : "JavaScript"}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === activity.id ? null : activity.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openDropdown === activity.id && (
                    <div className="absolute right-0 top-8 w-40 bg-popover border border-border rounded-lg shadow-lg py-1 z-10">
                      <button className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </button>
                      <button className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {activity.description}
              </p>

              {/* Status & Meta */}
              <div className="flex items-center justify-between">
                {getStatusBadge(activity.status)}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{activity.updatedAt}</span>
                </div>
              </div>

              {/* Provider & URL */}
              {activity.url && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {activity.provider}
                  </span>
                  <a
                    href={activity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          ))}

          {/* Empty State */}
          {filteredActivities.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No activities found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Create your first Custom Activity with AI"}
              </p>
              {!searchQuery && (
                <Button variant="gradient" asChild>
                  <Link to="/dashboard/activities/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Activity
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Activities;
