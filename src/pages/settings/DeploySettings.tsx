import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Cloud, Server, Plus, Settings, ExternalLink, CheckCircle } from "lucide-react";

const deployProviders = [
  {
    id: "vercel",
    name: "Vercel",
    icon: Rocket,
    description: "Deploy to Vercel for instant global deployments with edge functions.",
    connected: false,
    recommended: true,
    features: ["Edge Functions", "Preview Deployments", "Auto SSL"],
  },
  {
    id: "render",
    name: "Render",
    icon: Cloud,
    description: "Full-stack deployment platform with free tier available.",
    connected: false,
    features: ["Docker Support", "Auto Deploy", "Managed DBs"],
  },
  {
    id: "railway",
    name: "Railway",
    icon: Server,
    description: "Simple deployment platform with generous free tier.",
    connected: false,
    features: ["One-click Deploy", "GitHub Integration", "Easy Scaling"],
  },
  {
    id: "heroku",
    name: "Heroku",
    icon: Cloud,
    description: "Classic PaaS with extensive add-on ecosystem.",
    connected: false,
    features: ["Add-ons", "Pipelines", "Enterprise Ready"],
  },
];

const DeploySettings = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState(deployProviders);

  const handleConnect = (providerId: string) => {
    toast({
      title: "Coming Soon",
      description: `${providerId} integration is being set up. Contact support for early access.`,
    });
  };

  const handleConfigure = (providerId: string) => {
    toast({
      title: "Configure Provider",
      description: `Opening ${providerId} configuration...`,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Deployment Providers</h1>
          <p className="text-muted-foreground">
            Connect deployment providers to automatically deploy your Custom Activities.
          </p>
        </div>

        <div className="space-y-4">
          {providers.map((provider) => {
            const Icon = provider.icon;

            return (
              <div
                key={provider.id}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{provider.name}</h3>
                        {provider.recommended && (
                          <Badge className="bg-primary/10 text-primary border-0">Recommended</Badge>
                        )}
                        {provider.connected && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {provider.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {provider.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {provider.connected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfigure(provider.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`https://${provider.id}.com`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
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
        </div>

        {/* Default Provider */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Default Deployment Provider</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose the default provider for one-click deployments. You can always select a different provider when deploying.
          </p>
          <div className="flex items-center gap-4">
            <select className="flex-1 h-10 rounded-lg border border-input bg-background px-4 text-sm">
              <option value="">Select a provider...</option>
              {providers.filter(p => p.connected).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Button variant="outline">Save</Button>
          </div>
          {!providers.some(p => p.connected) && (
            <p className="text-xs text-muted-foreground mt-2">
              Connect a provider above to set as default.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DeploySettings;
