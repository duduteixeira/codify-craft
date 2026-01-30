import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, ExternalLink, CheckCircle, LucideIcon } from "lucide-react";

interface GitIntegration {
  id: string;
  provider: string;
  account_username: string | null;
  connected_at: string;
}

interface GitProviderCardProps {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  color: string;
  supported: boolean;
  integration: GitIntegration | undefined;
  isConnecting: boolean;
  onConnect: (token: string) => Promise<void>;
  onDisconnect: (integrationId: string) => Promise<void>;
}

const GitProviderCard = ({
  id,
  name,
  icon: Icon,
  description,
  color,
  supported,
  integration,
  isConnecting,
  onConnect,
  onDisconnect,
}: GitProviderCardProps) => {
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitToken = async () => {
    if (!token.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onConnect(token.trim());
      setShowTokenDialog(false);
      setToken("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{name}</h3>
                {integration && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                )}
                {!supported && (
                  <Badge variant="outline" className="text-xs">
                    Coming Soon
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {description}
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
                  <a 
                    href={`https://${id}.com/${integration.account_username}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDisconnect(integration.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTokenDialog(true)}
                disabled={!supported || isConnecting}
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

      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {name}</DialogTitle>
            <DialogDescription>
              Enter your {name} Personal Access Token to connect your account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token">Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">How to create a token:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub → Settings → Developer settings → Personal access tokens</a></li>
                <li>Click "Generate new token (classic)"</li>
                <li>Select scopes: <code className="bg-background px-1 rounded">repo</code> and <code className="bg-background px-1 rounded">user:email</code></li>
                <li>Generate and copy the token</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTokenDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitToken} 
              disabled={!token.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GitProviderCard;
