import { useState } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock activity data
const mockActivity = {
  id: "1",
  name: "Slack Notifier",
  description: "Send customer data to Slack channel when entering journey",
  status: "deployed",
  version: "nodejs",
  createdAt: "2024-01-15",
  updatedAt: "2 hours ago",
  deployment: {
    provider: "Vercel",
    baseUrl: "https://slack-notifier.vercel.app",
    endpoints: {
      execute: "https://slack-notifier.vercel.app/execute",
      save: "https://slack-notifier.vercel.app/save",
      publish: "https://slack-notifier.vercel.app/publish",
      validate: "https://slack-notifier.vercel.app/validate",
    },
    deployedAt: "2024-01-20 14:32",
  },
  gitRepo: {
    provider: "GitHub",
    name: "slack-notifier-activity",
    url: "https://github.com/user/slack-notifier-activity",
    lastCommit: "abc123",
    lastCommitAt: "2 hours ago",
  },
  config: {
    workflowApiVersion: "1.1",
    metaData: {
      icon: "images/icon.png",
      category: "message",
    },
    type: "REST",
    lang: {
      "en-US": {
        name: "Slack Notifier",
        description: "Send notifications to Slack",
      },
    },
    arguments: {
      execute: {
        inArguments: [
          { emailAddress: "{{Contact.Attribute.EmailAddress}}" },
          { firstName: "{{Contact.Attribute.FirstName}}" },
        ],
        outArguments: [{ status: "" }],
        url: "https://slack-notifier.vercel.app/execute",
      },
    },
  },
  files: [
    { name: "package.json", type: "json", size: "1.2 KB" },
    { name: "server.js", type: "javascript", size: "2.8 KB" },
    { name: "routes/execute.js", type: "javascript", size: "3.4 KB" },
    { name: "routes/save.js", type: "javascript", size: "1.1 KB" },
    { name: "routes/publish.js", type: "javascript", size: "0.8 KB" },
    { name: "routes/validate.js", type: "javascript", size: "0.9 KB" },
    { name: "public/index.html", type: "html", size: "4.2 KB" },
    { name: "public/config.json", type: "json", size: "2.1 KB" },
    { name: "public/js/customActivity.js", type: "javascript", size: "5.6 KB" },
  ],
};

const codePreview = `const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/execute', async (req, res) => {
  try {
    const { inArguments, journeyId, activityId } = req.body;
    const args = inArguments[0];
    
    console.log('Execute called with:', args);
    
    // Extract input arguments
    const emailAddress = args.emailAddress;
    const firstName = args.firstName;
    
    // Send to Slack webhook
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    await axios.post(webhookUrl, {
      text: \`New customer: \${firstName} (\${emailAddress})\`,
      channel: process.env.SLACK_CHANNEL
    });
    
    res.status(200).json({
      success: true,
      status: 'sent'
    });
    
  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;`;

const ActivityDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "code" | "config" | "deploy">("overview");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
    setTimeout(() => setCopied(null), 2000);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Zap },
    { id: "code", label: "Code", icon: Code2 },
    { id: "config", label: "Config", icon: FileJson },
    { id: "deploy", label: "Deploy", icon: Rocket },
  ];

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
                <h1 className="text-2xl font-bold">{mockActivity.name}</h1>
                <span className="status-deployed px-2.5 py-0.5 rounded-full text-xs font-medium border">
                  Deployed
                </span>
              </div>
              <p className="text-muted-foreground">{mockActivity.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Endpoints */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4">Endpoint URLs</h3>
                <div className="space-y-3">
                  {Object.entries(mockActivity.deployment.endpoints).map(([key, url]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                      <div>
                        <span className="text-sm font-medium capitalize">{key}</span>
                        <p className="text-xs text-muted-foreground font-code">{url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(url, key)}
                      >
                        {copied === key ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Files */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Generated Files</h3>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download ZIP
                  </Button>
                </div>
                <div className="space-y-1">
                  {mockActivity.files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileJson className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-code">{file.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{file.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Deployment Info */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-primary" />
                  Deployment
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium">{mockActivity.deployment.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium capitalize">{mockActivity.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deployed</span>
                    <span className="font-medium">{mockActivity.deployment.deployedAt}</span>
                  </div>
                  <a
                    href={mockActivity.deployment.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline mt-2"
                  >
                    Open Live URL <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Git Info */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Git Repository
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium">{mockActivity.gitRepo.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repository</span>
                    <span className="font-medium">{mockActivity.gitRepo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Commit</span>
                    <span className="font-code text-xs">{mockActivity.gitRepo.lastCommit}</span>
                  </div>
                  <a
                    href={mockActivity.gitRepo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline mt-2"
                  >
                    View on GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "code" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-sm font-code">routes/execute.js</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(codePreview, "Code")}
              >
                {copied === "Code" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <pre className="p-4 overflow-auto text-sm font-code text-muted-foreground">
              <code>{codePreview}</code>
            </pre>
          </div>
        )}

        {activeTab === "config" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-sm font-code">config.json</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(mockActivity.config, null, 2), "Config")}
              >
                {copied === "Config" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <pre className="p-4 overflow-auto text-sm font-code text-muted-foreground">
              <code>{JSON.stringify(mockActivity.config, null, 2)}</code>
            </pre>
          </div>
        )}

        {activeTab === "deploy" && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6">
              <Rocket className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Deployment Management</h3>
            <p className="text-muted-foreground mb-6">
              Your activity is deployed and running on {mockActivity.deployment.provider}.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Redeploy
              </Button>
              <Button variant="gradient">
                <Settings className="h-4 w-4 mr-2" />
                Configure Environment
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ActivityDetail;
