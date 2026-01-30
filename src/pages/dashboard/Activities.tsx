import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Zap, Loader2 } from "lucide-react";
import { useActivities } from "@/hooks/useActivities";
import { useSubscription } from "@/hooks/useSubscription";
import { ActivityCard } from "@/components/dashboard/ActivityCard";

const statusFilters = ["all", "deployed", "generating", "generated", "draft", "failed"];

const Activities = () => {
  const { activities, loading, deleteActivity, duplicateActivity } = useActivities();
  const { canCreateActivity, getRemainingActivities } = useSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = activeFilter === "all" || activity.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const remaining = getRemainingActivities();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Activities</h1>
            <p className="text-muted-foreground">
              Manage your Custom Activities
              {remaining !== "∞" && (
                <span className="ml-2 text-xs">
                  ({remaining} remaining on your plan)
                </span>
              )}
            </p>
          </div>
          <Button
            variant="gradient"
            asChild
            disabled={!canCreateActivity()}
          >
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Activities Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onDelete={deleteActivity}
                onDuplicate={duplicateActivity}
              />
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
                {!searchQuery && canCreateActivity() && (
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
        )}
      </div>
    </DashboardLayout>
  );
};

export default Activities;
