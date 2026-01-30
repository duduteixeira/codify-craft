import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ArrowLeft,
  Code2,
  FileJson,
  Rocket,
  GitBranch,
  ExternalLink,
  Copy,
  Check,
  Download,
  RefreshCw,
  Settings,
  Loader2,
  Sparkles,
  Github,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscription } from "@/hooks/useSubscription";
import { downloadActivityZip } from "@/lib/downloadZip";

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    deployed: "status-deployed",
    generating: "status-generating",
    generated: "status-generated",
    draft: "status-draft",
    failed: "status-failed",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ActivityDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { incrementGenerationCount, canGenerateAI } = useSubscription();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activity, setActivity] = useState<any>(null);
  const [gitRepo, setGitRepo] = useState<any>(null);
  const [deployment, setDeployment] = useState<any>(null);
  const [codeFile, setCodeFile] = useState<string>("server.js");
  useEffect(() => {
    if (id && user) {
      loadActivity();
    }
  }, [id, user]);

  const loadActivity = async () => {
    try {
      const [activityRes, repoRes, deployRes] = await Promise.all([
        supabase.from("custom_activities").select("*").eq("id", id).single(),
        supabase.from("git_repositories").select("*").eq("custom_activity_id", id).maybeSingle(),
        supabase.from("deployments").select("*").eq("custom_activity_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (activityRes.error) throw activityRes.error;
      setActivity(activityRes.data);
      setGitRepo(repoRes.data);
      setDeployment(deployRes.data);
    } catch (error) {
      console.error("Error loading activity:", error);
      toast({ title: "Error", description: "Failed to load activity", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    if (!activity?.extracted_requirements) {
      toast({ title: "No requirements", description: "Please generate requirements first", variant: "destructive" });
      return;
    }

    if (!canGenerateAI()) {
      toast({ 
        title: "Limit reached", 
        description: "You've reached your AI generation limit. Please upgrade your plan.", 
        variant: "destructive" 
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-code", {
        body: {
          requirements: activity.extracted_requirements,
          activityName: activity.name,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Increment generation count
      await incrementGenerationCount();

      // Update activity with generated code
      const { error: updateError } = await supabase
        .from("custom_activities")
        .update({
          config_json: data.configJson,
          nodejs_code: data.nodejsCode,
          javascript_code: { "customActivity.js": data.javascriptCode },
          status: "generated",
          generated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      toast({ title: "Code Generated!", description: "Your Custom Activity code is ready." });
      loadActivity();
    } catch (error: any) {
      console.error("Code generation error:", error);
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadZip = async () => {
    if (!activity?.nodejs_code) return;
    
    try {
      await downloadActivityZip({
        name: activity.name,
        config_json: activity.config_json,
        nodejs_code: activity.nodejs_code,
        javascript_code: activity.javascript_code,
        extracted_requirements: activity.extracted_requirements,
      });
      toast({ title: "Download started", description: "Your ZIP file is being downloaded." });
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Download failed", description: "Failed to generate ZIP file", variant: "destructive" });
    }
  };

  const pushToGitHub = async () => {
    if (!gitRepo || !activity?.nodejs_code) {
      toast({ title: "Not ready", description: "Generate code and connect GitHub first", variant: "destructive" });
      return;
    }

    try {
      const files = {
        ...activity.nodejs_code,
        "public/config.json": JSON.stringify(activity.config_json, null, 2),
        ...(activity.javascript_code || {}),
      };

      const { data, error } = await supabase.functions.invoke("github-repos", {
        body: {
          action: "push",
          user_id: user?.id,
          repo_name: gitRepo.repository_name,
          activity_id: id,
          files,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: "Pushed to GitHub!", description: `Commit: ${data.commit_sha?.slice(0, 7)}` });
      loadActivity();
    } catch (error: any) {
      toast({ title: "Push failed", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!activity) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Activity not found</p>
          <Button variant="outline" asChild className="mt-4">
            <Link to="/dashboard/activities">Back to Activities</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const hasCode = activity.nodejs_code && Object.keys(activity.nodejs_code).length > 0;
  const codeFiles = hasCode ? Object.keys(activity.nodejs_code) : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link
              to="/dashboard/activities"
              className="mt-1 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{activity.name}</h1>
                {getStatusBadge(activity.status)}
              </div>
              <p className="text-muted-foreground">{activity.description || activity.extracted_requirements?.activityDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!hasCode && (
              <Button variant="gradient" onClick={generateCode} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Code
                  </>
                )}
              </Button>
            )}
            {hasCode && (
              <>
                <Button variant="outline" size="sm" onClick={generateCode} disabled={generating}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadZip}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Generation in progress */}
        {generating && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Generating Code...</h3>
            <p className="text-muted-foreground text-sm">
              AI is creating config.json, Node.js server, and client-side JavaScript
            </p>
          </div>
        )}

        {/* Tabs */}
        {!generating && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview" className="gap-2">
                <Zap className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-2" disabled={!hasCode}>
                <Code2 className="h-4 w-4" /> Code
              </TabsTrigger>
              <TabsTrigger value="config" className="gap-2" disabled={!activity.config_json}>
                <FileJson className="h-4 w-4" /> Config
              </TabsTrigger>
              <TabsTrigger value="deploy" className="gap-2">
                <Rocket className="h-4 w-4" /> Deploy
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Requirements */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4">Extracted Requirements</h3>
                    {activity.extracted_requirements ? (
                      <div className="space-y-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Category:</span>{" "}
                          <span className="font-medium capitalize">{activity.extracted_requirements.category}</span>
                        </div>
                        {activity.extracted_requirements.inArguments?.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-2">Input Arguments:</span>
                            <div className="space-y-1">
                              {activity.extracted_requirements.inArguments.map((arg: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <code className="text-primary">{arg.name}</code>
                                  <span className="text-muted-foreground">({arg.type})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {activity.extracted_requirements.externalAPIs?.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-2">External APIs:</span>
                            {activity.extracted_requirements.externalAPIs.map((api: any, i: number) => (
                              <div key={i} className="text-sm">
                                {api.name} — {api.authentication}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Decision Split:</span>
                          <span className={activity.extracted_requirements.isDecisionSplit ? "text-primary" : ""}>
                            {activity.extracted_requirements.isDecisionSplit ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No requirements extracted yet</p>
                    )}
                  </div>

                  {/* Files */}
                  {hasCode && (
                    <div className="rounded-xl border border-border bg-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Generated Files</h3>
                        <Button variant="outline" size="sm" onClick={handleDownloadZip}>
                          <Download className="h-4 w-4 mr-2" />
                          Download ZIP
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {codeFiles.map((file) => (
                          <button
                            key={file}
                            onClick={() => { setCodeFile(file); setActiveTab("code"); }}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <Code2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-code">{file}</span>
                            </div>
                          </button>
                        ))}
                        {activity.config_json && (
                          <button
                            onClick={() => setActiveTab("config")}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <FileJson className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-code">public/config.json</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Git Repo */}
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      Git Repository
                    </h3>
                    {gitRepo ? (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Repository</span>
                          <span className="font-medium">{gitRepo.repository_name}</span>
                        </div>
                        {gitRepo.last_commit_sha && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Commit</span>
                            <span className="font-code text-xs">{gitRepo.last_commit_sha.slice(0, 7)}</span>
                          </div>
                        )}
                        <a
                          href={gitRepo.repository_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline mt-2"
                        >
                          View on GitHub <ExternalLink className="h-3 w-3" />
                        </a>
                        {hasCode && (
                          <Button variant="outline" size="sm" className="w-full mt-2" onClick={pushToGitHub}>
                            <Github className="h-4 w-4 mr-2" />
                            Push to GitHub
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-3">No repository connected</p>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/dashboard/git">Connect GitHub</Link>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Deployment */}
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-primary" />
                      Deployment
                    </h3>
                    {deployment ? (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Provider</span>
                          <span className="font-medium capitalize">{deployment.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="font-medium capitalize">{deployment.status}</span>
                        </div>
                        {deployment.base_url && (
                          <a
                            href={deployment.base_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            Open Live URL <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-3">Not deployed yet</p>
                        <Button variant="outline" size="sm" onClick={() => setActiveTab("deploy")}>
                          Deploy Activity
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="mt-6">
              {hasCode && (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {codeFiles.map((file) => (
                      <Button
                        key={file}
                        variant={codeFile === file ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCodeFile(file)}
                      >
                        {file}
                      </Button>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <span className="text-sm font-code">{codeFile}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(activity.nodejs_code[codeFile], codeFile)}
                      >
                        {copied === codeFile ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="p-4 overflow-auto text-sm font-code text-muted-foreground max-h-[600px]">
                      <code>{activity.nodejs_code[codeFile]}</code>
                    </pre>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="config" className="mt-6">
              {activity.config_json && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <span className="text-sm font-code">config.json</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(activity.config_json, null, 2), "config.json")}
                    >
                      {copied === "config.json" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 overflow-auto text-sm font-code text-muted-foreground max-h-[600px]">
                    <code>{JSON.stringify(activity.config_json, null, 2)}</code>
                  </pre>
                </div>
              )}
            </TabsContent>

            <TabsContent value="deploy" className="mt-6">
              <div className="max-w-2xl mx-auto text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6">
                  <Rocket className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Deploy Your Activity</h3>
                <p className="text-muted-foreground mb-6">
                  {hasCode
                    ? "Push your code to GitHub and deploy to your preferred hosting provider."
                    : "Generate code first, then deploy to your preferred hosting provider."}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {!hasCode ? (
                    <Button variant="gradient" onClick={generateCode} disabled={generating}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Code First
                    </Button>
                  ) : (
                    <>
                      {gitRepo && (
                        <Button variant="outline" onClick={pushToGitHub}>
                          <Github className="h-4 w-4 mr-2" />
                          Push to GitHub
                        </Button>
                      )}
                      <Button variant="gradient" asChild>
                        <Link to="/dashboard/settings/deploy">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure Deployment
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ActivityDetail;
