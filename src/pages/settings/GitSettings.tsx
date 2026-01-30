import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Github, GitBranch, Plus, Trash2, ExternalLink, CheckCircle } from "lucide-react";

const providers = [
  {
    id: "github",
    name: "GitHub",
    icon: Github,
    description: "Connect your GitHub account to push activities to repositories.",
    color: "bg-[#24292e]",
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: GitBranch,
    description: "Connect your GitLab account for repository integration.",
    color: "bg-[#fc6d26]",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    icon: GitBranch,
    description: "Connect your Bitbucket account for Atlassian integration.",
    color: "bg-[#0052cc]",
  },
];

const GitSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);

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

  const handleConnect = (providerId: string) => {
    // In production, this would initiate OAuth flow
    toast({
      title: "Coming Soon",
      description: `${providerId} OAuth integration is being set up. Contact support for early access.`,
    });
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
            {providers.map((provider) => {
              const integration = getProviderIntegration(provider.id);
              const Icon = provider.icon;

              return (
                <div
                  key={provider.id}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${provider.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{provider.name}</h3>
                          {integration && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {provider.description}
                        </p>
                        {integration && (
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Account: <span className="text-foreground">{integration.account_username || "Connected"}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Connected: {new Date(integration.connected_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {integration ? (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <a href={`https://${provider.id}.com`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(integration.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnect(provider.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

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
