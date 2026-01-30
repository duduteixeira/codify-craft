import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import GitProviderCard from "@/components/settings/GitProviderCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Github, GitBranch } from "lucide-react";

interface GitIntegration {
  id: string;
  provider: string;
  account_username: string | null;
  connected_at: string;
}

const providers = [
  {
    id: "github",
    name: "GitHub",
    icon: Github,
    description: "Connect your GitHub account to push activities to repositories.",
    color: "bg-[#24292e]",
    supported: true,
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: GitBranch,
    description: "Connect your GitLab account for repository integration.",
    color: "bg-[#fc6d26]",
    supported: false,
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    icon: GitBranch,
    description: "Connect your Bitbucket account for Atlassian integration.",
    color: "bg-[#0052cc]",
    supported: false,
  },
];

const GitSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<GitIntegration[]>([]);

  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from("git_integrations")
        .select("*")
        .eq("user_id", user?.id);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error("Error loading integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (providerId: string, token: string) => {
    if (providerId !== "github") {
      toast({
        title: "Coming Soon",
        description: `${providerId} integration is being set up. Contact support for early access.`,
      });
      return;
    }

    setConnecting(providerId);
    try {
      const { data, error } = await supabase.functions.invoke("github-oauth", {
        body: { token, user_id: user?.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "GitHub Connected!",
        description: `Connected as ${data.username}`,
      });
      
      await loadIntegrations();
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect GitHub",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from("git_integrations")
        .delete()
        .eq("id", integrationId);

      if (error) throw error;

      setIntegrations(integrations.filter(i => i.id !== integrationId));
      toast({
        title: "Disconnected",
        description: "Git provider has been disconnected.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect",
        variant: "destructive",
      });
    }
  };

  const getProviderIntegration = (providerId: string) => {
    return integrations.find(i => i.provider === providerId);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Git Connections</h1>
          <p className="text-muted-foreground">
            Connect your Git providers to automatically push generated code to repositories.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => (
              <GitProviderCard
                key={provider.id}
                id={provider.id}
                name={provider.name}
                icon={provider.icon}
                description={provider.description}
                color={provider.color}
                supported={provider.supported}
                integration={getProviderIntegration(provider.id)}
                isConnecting={connecting === provider.id}
                onConnect={(token) => handleConnect(provider.id, token)}
                onDisconnect={handleDisconnect}
              />
            ))}

            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                More Git providers coming soon. Request a provider by contacting support.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default GitSettings;
