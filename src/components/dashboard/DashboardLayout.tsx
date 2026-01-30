import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Zap,
  LayoutDashboard,
  FolderKanban,
  Settings,
  GitBranch,
  BarChart3,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  User,
  CreditCard,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Activities", href: "/dashboard/activities", icon: FolderKanban },
  { name: "Git Connections", href: "/dashboard/git", icon: GitBranch },
  { name: "Deploy Providers", href: "/dashboard/settings/deploy", icon: Rocket },
  { name: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; company_name: string | null } | null>(null);
  const [subscription, setSubscription] = useState<{ plan: string; custom_activities_count: number } | null>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    const [profileRes, subRes] = await Promise.all([
      supabase.from("profiles").select("full_name, company_name").eq("user_id", user?.id).maybeSingle(),
      supabase.from("user_subscriptions").select("plan, custom_activities_count").eq("user_id", user?.id).maybeSingle(),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    if (subRes.data) setSubscription(subRes.data);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-gradient-primary p-1.5 rounded-lg">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-bold">
                <span className="text-gradient">Activity</span>
                <span className="text-sidebar-foreground">Forge</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* New Activity Button */}
        <div className="p-4">
          <Button
            variant="gradient"
            className={cn("w-full", collapsed ? "px-0" : "")}
            asChild
          >
            <Link to="/dashboard/activities/new">
              <Plus className="h-4 w-4" />
              {!collapsed && <span className="ml-2">New Activity</span>}
            </Link>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User className="h-4 w-4 text-sidebar-foreground" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("flex-1 transition-all duration-300", collapsed ? "ml-16" : "ml-64")}>
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center justify-between h-full px-6">
            {/* Search */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search activities..."
                className="w-full h-9 pl-10 pr-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              </button>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground capitalize">{subscription?.plan || "Free"} Plan</span>
                <div className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                  {subscription?.custom_activities_count || 0}/{subscription?.plan === "pro" ? 50 : subscription?.plan === "enterprise" ? "∞" : 3} Activities
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
