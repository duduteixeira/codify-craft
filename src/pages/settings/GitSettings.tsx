import { useState, useEffect, useCallback } from "react";
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
  const [integrations, setIntegrations] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");

      if (code && state) {
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);

        setConnecting("github");
        try {
          const { data, error } = await supabase.functions.invoke("github-oauth", {
            body: { code, state, user_id: user?.id },
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          toast({
            title: "GitHub Connected!",
            description: `Connected as ${data.username}`,
          });
          loadIntegrations();
        } catch (error: any) {
          toast({
            title: "Connection failed",
            description: error.message || "Failed to connect GitHub",
            variant: "destructive",
          });
        } finally {
          setConnecting(null);
        }
      }
    };

    if (user) {
      handleCallback();
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

  const handleConnect = async (providerId: string) => {
    if (providerId !== "github") {
      toast({
        title: "Coming Soon",
        description: `${providerId} OAuth integration is being set up. Contact support for early access.`,
      });
      return;
    }

    setConnecting(providerId);
    try {
      const redirectUri = `${window.location.origin}/dashboard/git`;
      
      const { data, error } = await supabase.functions.invoke("github-oauth", {
        body: {},
      });

      // Check if edge function returned an error about missing secrets
      if (data?.error?.includes("not configured")) {
        toast({
          title: "GitHub OAuth Not Configured",
          description: "Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET secrets to enable GitHub integration.",
          variant: "destructive",
        });
        setConnecting(null);
        return;
      }

      // Build the authorization URL
      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.set("client_id", ""); // Will be set by edge function
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", "repo user:email");
      authUrl.searchParams.set("state", crypto.randomUUID());

      // Get auth URL from edge function
      const { data: authData, error: authError } = await supabase.functions.invoke("github-oauth", {
        body: { redirect_uri: redirectUri },
      });

      if (authError) throw authError;
      if (authData.error) throw new Error(authData.error);

      // Redirect to GitHub
      window.location.href = authData.url;
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to initiate GitHub connection",
        variant: "destructive",
      });
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
            {providers.map((provider) => {
              const integration = getProviderIntegration(provider.id);
              const Icon = provider.icon;
              const isConnecting = connecting === provider.id;

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
                          {!provider.supported && (
                            <Badge variant="outline" className="text-xs">
                              Coming Soon
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
                            <a href={`https://${provider.id}.com/${integration.account_username}`} target="_blank" rel="noopener noreferrer">
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
                          disabled={!provider.supported || isConnecting}
                        >
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Connect
                            </>
                          )}
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

            {/* GitHub OAuth Setup Instructions */}
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold mb-3">Setup GitHub OAuth</h3>
              <p className="text-sm text-muted-foreground mb-4">
                To enable GitHub integration, you need to create a GitHub OAuth App and add the credentials as secrets.
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App</li>
                <li>Set Homepage URL to your app URL</li>
                <li>Set Authorization callback URL to: <code className="text-primary">{window.location.origin}/dashboard/git</code></li>
                <li>Copy Client ID and Client Secret</li>
                <li>Add them as GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET secrets in Lovable</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default GitSettings;
