import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  ArrowRight,
  Code2,
  Lightbulb,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const examplePrompts = [
  {
    title: "Slack Notification",
    prompt: "I want to send a Slack message when a customer enters the journey. Include their email, name, and the campaign name. Use a webhook to post to a specific channel that the user configures.",
  },
  {
    title: "CRM Sync",
    prompt: "Create a custom activity that syncs contact data with HubSpot. When a contact enters the journey, update their properties in HubSpot with the latest Marketing Cloud data.",
  },
  {
    title: "SMS via Twilio",
    prompt: "Send a personalized SMS using Twilio. The message template should be configurable, and include merge fields for first name and order number. Handle delivery status callbacks.",
  },
  {
    title: "Decision Split",
    prompt: "Create a decision split activity that checks if a customer has made a purchase in the last 30 days by calling our internal API. Return 'Buyer' or 'Non-Buyer' outcomes.",
  },
];

const NewActivity = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"prompt" | "review" | "generating">("prompt");
  const [loading, setLoading] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    prompt: "",
  });
  const [extractedRequirements, setExtractedRequirements] = useState<any>(null);

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe what your Custom Activity should do.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setStep("generating");

    try {
      const { data, error } = await supabase.functions.invoke("generate-activity", {
        body: {
          prompt: formData.prompt,
          activityName: formData.name,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setExtractedRequirements(data.requirements);
      setStep("review");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate requirements. Please try again.",
        variant: "destructive",
      });
      setStep("prompt");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndGenerate = async () => {
    setLoading(true);

    try {
      // Save activity to database
      const { data: activity, error } = await supabase
        .from("custom_activities")
        .insert({
          user_id: user?.id,
          name: extractedRequirements.activityName || formData.name || "Custom Activity",
          description: extractedRequirements.activityDescription,
          status: "generated",
          original_prompt: formData.prompt,
          extracted_requirements: extractedRequirements,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Activity Generated!",
        description: "Your Custom Activity is ready. You can now review the code and deploy.",
      });
      navigate(`/dashboard/activities/${activity.id}`);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Failed to save",
        description: error.message || "Failed to save activity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyExample = (prompt: string) => {
    setFormData({ ...formData, prompt });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Create New Activity</h1>
          <p className="text-muted-foreground">
            Describe what you want your Custom Activity to do, and our AI will generate production-ready code.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          {[
            { num: 1, label: "Describe", key: "prompt" },
            { num: 2, label: "Review", key: "review" },
            { num: 3, label: "Generate", key: "generating" },
          ].map((s, idx) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s.key
                    ? "bg-primary text-primary-foreground"
                    : (step === "review" && idx < 1)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {(step === "review" && idx === 0) || (step === "generating" && idx <= 1) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  s.num
                )}
              </div>
              <span className={`text-sm ${step === s.key ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {idx < 2 && <div className="w-16 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Prompt */}
        {step === "prompt" && (
          <div className="space-y-6">
            {/* Activity Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Activity Name (optional)</Label>
              <Input
                id="name"
                placeholder="e.g., Slack Notifier, HubSpot Sync"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Main Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Describe Your Activity</Label>
              <div className="relative">
                <Textarea
                  id="prompt"
                  placeholder="Describe in plain language what your Custom Activity should do. Include:
• What data should come from Journey Builder
• What external APIs to integrate
• What should happen during execution
• What configuration options users should see"
                  className="min-h-[200px] resize-none"
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                />
                <div className="absolute bottom-3 right-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>Powered by Lovable AI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setShowTips(!showTips)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Tips for better results</span>
                </div>
                {showTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showTips && (
                <div className="px-4 pb-4 space-y-3">
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Be specific about the data you need from Journey Builder (email, name, custom attributes)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Mention authentication methods for external APIs (OAuth, API keys, webhooks)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Describe the configuration UI fields users should see
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      If it's a decision split, describe the possible outcomes
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Example Prompts */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Try an example:</p>
              <div className="grid grid-cols-2 gap-3">
                {examplePrompts.map((example) => (
                  <button
                    key={example.title}
                    onClick={() => applyExample(example.prompt)}
                    className="text-left p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <p className="font-medium text-sm mb-1">{example.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {example.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              variant="gradient"
              size="xl"
              className="w-full"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate with AI
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Review Requirements */}
        {step === "review" && extractedRequirements && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                Extracted Requirements
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Activity Name</Label>
                  <p className="font-medium">{extractedRequirements.activityName}</p>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <p className="font-medium capitalize">{extractedRequirements.category}</p>
                </div>

                {extractedRequirements.inArguments?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Input Arguments</Label>
                    <div className="space-y-1">
                      {extractedRequirements.inArguments.map((arg: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="font-code text-primary">{arg.name}</span>
                          <span className="text-muted-foreground">({arg.type})</span>
                          {arg.required && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">required</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extractedRequirements.externalAPIs?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">External APIs</Label>
                    <div className="space-y-1">
                      {extractedRequirements.externalAPIs.map((api: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{api.name}</span>
                          <span className="text-muted-foreground">— {api.baseUrl || api.authentication}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extractedRequirements.executionSteps?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Execution Steps</Label>
                    <div className="space-y-2">
                      {extractedRequirements.executionSteps.map((step: any) => (
                        <div key={step.order} className="flex items-start gap-3 text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">
                            {step.order}
                          </span>
                          <div>
                            <p className="font-medium">{step.action}</p>
                            <p className="text-muted-foreground">{step.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <span className="text-sm text-muted-foreground">Decision Split:</span>
                  <span className={`text-sm font-medium ${extractedRequirements.isDecisionSplit ? "text-primary" : "text-muted-foreground"}`}>
                    {extractedRequirements.isDecisionSplit ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("prompt")} className="flex-1">
                Back to Edit
              </Button>
              <Button variant="gradient" onClick={handleConfirmAndGenerate} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4" />
                    Save Activity
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === "generating" && loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-xl rounded-full animate-glow-pulse" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Analyzing your requirements...</h3>
            <p className="text-muted-foreground mb-4">
              AI is extracting structured requirements from your description
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              This usually takes 10-30 seconds
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NewActivity;
