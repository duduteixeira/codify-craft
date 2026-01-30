import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap,
  GitBranch,
  Server,
  Code2,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  AlertTriangle,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type ProjectType = "custom-activity" | "decision-split";
type Stack = "node" | "ssjs";
type WizardStep = "type" | "stack" | "describe" | "configure" | "review" | "generating";

interface Outcome {
  key: string;
  label: string;
  condition: string;
}

interface ConfigField {
  name: string;
  type: "text" | "textarea" | "select" | "number" | "url" | "checkbox";
  label: string;
  required: boolean;
}

const NewActivityWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    canCreateActivity,
    canGenerateAI,
    incrementActivityCount,
    incrementGenerationCount,
    subscription,
    loading: subscriptionLoading,
  } = useSubscription();

  const [step, setStep] = useState<WizardStep>("type");
  const [loading, setLoading] = useState(false);
  const [extractedRequirements, setExtractedRequirements] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Form state
  const [projectType, setProjectType] = useState<ProjectType>("custom-activity");
  const [stack, setStack] = useState<Stack>("node");
  const [activityName, setActivityName] = useState("");
  const [description, setDescription] = useState("");
  const [outcomes, setOutcomes] = useState<Outcome[]>([
    { key: "outcome_yes", label: "Yes", condition: "When condition is met" },
    { key: "outcome_no", label: "No", condition: "When condition is not met" },
  ]);
  const [configFields, setConfigFields] = useState<ConfigField[]>([]);

  const steps: { key: WizardStep; label: string; icon: any }[] = [
    { key: "type", label: "Type", icon: Zap },
    { key: "stack", label: "Stack", icon: Server },
    { key: "describe", label: "Describe", icon: Sparkles },
    { key: "configure", label: "Configure", icon: Code2 },
    { key: "review", label: "Review", icon: Check },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  const handleNext = async () => {
    if (step === "type") {
      setStep("stack");
    } else if (step === "stack") {
      setStep("describe");
    } else if (step === "describe") {
      if (!activityName.trim() || !description.trim()) {
        toast({
          title: "Required fields",
          description: "Please enter both activity name and description.",
          variant: "destructive",
        });
        return;
      }
      await generateRequirements();
    } else if (step === "configure") {
      setStep("review");
    } else if (step === "review") {
      await createActivity();
    }
  };

  const handleBack = () => {
    if (step === "stack") setStep("type");
    else if (step === "describe") setStep("stack");
    else if (step === "configure") setStep("describe");
    else if (step === "review") setStep("configure");
  };

  const generateRequirements = async () => {
    if (!canGenerateAI()) {
      toast({
        title: "Generation limit reached",
        description: "You've used all your AI generations. Please upgrade your plan.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setStep("generating");

    try {
      // Build prompt with type context
      let prompt = description;
      if (projectType === "decision-split") {
        prompt += `\n\nThis is a DECISION SPLIT activity with the following outcomes: ${outcomes.map(o => o.label).join(", ")}`;
      }

      const { data, error } = await supabase.functions.invoke("generate-activity", {
        body: {
          prompt,
          activityName,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      await incrementGenerationCount();

      // Merge AI requirements with user selections
      const requirements = {
        ...data.requirements,
        isDecisionSplit: projectType === "decision-split",
        outcomes: projectType === "decision-split" ? outcomes : undefined,
      };

      setExtractedRequirements(requirements);
      setStep("configure");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate requirements. Please try again.",
        variant: "destructive",
      });
      setStep("describe");
    } finally {
      setLoading(false);
    }
  };

  const createActivity = async () => {
    if (!canCreateActivity()) {
      toast({
        title: "Limit reached",
        description: "You've reached your activity limit. Please upgrade your plan.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create activity in database
      const { data: activity, error } = await supabase
        .from("custom_activities")
        .insert({
          user_id: user?.id,
          name: extractedRequirements.activityName || activityName,
          description: extractedRequirements.activityDescription || description,
          status: "generated",
          original_prompt: description,
          extracted_requirements: extractedRequirements,
        })
        .select()
        .single();

      if (error) throw error;

      await incrementActivityCount();

      toast({
        title: "Activity Created!",
        description: "Your Custom Activity is ready. Generate code to complete it.",
      });

      navigate(`/dashboard/activities/${activity.id}`);
    } catch (error: any) {
      console.error("Create error:", error);
      toast({
        title: "Failed to create",
        description: error.message || "Failed to create activity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addOutcome = () => {
    const newKey = `outcome_${outcomes.length + 1}`;
    setOutcomes([...outcomes, { key: newKey, label: "", condition: "" }]);
  };

  const removeOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, field: keyof Outcome, value: string) => {
    const updated = [...outcomes];
    updated[index] = { 
      ...updated[index], 
      [field]: value,
      key: field === "label" ? value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") : updated[index].key
    };
    setOutcomes(updated);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Create New Activity</h1>
          <p className="text-muted-foreground">
            Build a production-ready SFMC Custom Activity with AI assistance.
          </p>
        </div>

        {/* Limit Warnings */}
        {!subscriptionLoading && (!canCreateActivity() || !canGenerateAI()) && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {!canCreateActivity() ? (
                <>Limit reached ({subscription?.plan === "free" ? "3" : "50"} activities). </>
              ) : (
                <>AI generation limit reached. </>
              )}
              <Link to="/dashboard/settings/billing" className="underline font-medium">
                Upgrade plan
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, idx) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  idx < currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : idx === currentStepIndex
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {idx < currentStepIndex ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-12 h-1 mx-2 rounded ${idx < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Choose Type */}
        {step === "type" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">What type of activity do you want to create?</h2>
            
            <RadioGroup value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
              <Card className={`cursor-pointer transition-all ${projectType === "custom-activity" ? "ring-2 ring-primary" : "hover:border-primary/50"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value="custom-activity" id="custom-activity" />
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="h-5 w-5 text-primary" />
                        Custom Activity
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Execute actions on contacts - send messages, call APIs, update data
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className={`cursor-pointer transition-all ${projectType === "decision-split" ? "ring-2 ring-primary" : "hover:border-primary/50"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value="decision-split" id="decision-split" />
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <GitBranch className="h-5 w-5 text-primary" />
                        Decision Split
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Route contacts to different paths based on API responses or conditions
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </RadioGroup>

            {/* Outcomes for Decision Split */}
            {projectType === "decision-split" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Define Outcomes (min. 2)</Label>
                  <Button variant="outline" size="sm" onClick={addOutcome}>
                    <Plus className="h-4 w-4 mr-1" /> Add Outcome
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {outcomes.map((outcome, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Input
                        placeholder="Label (e.g., Yes, No, Maybe)"
                        value={outcome.label}
                        onChange={(e) => updateOutcome(idx, "label", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Condition description"
                        value={outcome.condition}
                        onChange={(e) => updateOutcome(idx, "condition", e.target.value)}
                        className="flex-1"
                      />
                      {outcomes.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => removeOutcome(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Choose Stack */}
        {step === "stack" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Choose your technology stack</h2>
            
            <RadioGroup value={stack} onValueChange={(v) => setStack(v as Stack)}>
              <Card className={`cursor-pointer transition-all ${stack === "node" ? "ring-2 ring-primary" : "hover:border-primary/50"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value="node" id="node" />
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Server className="h-5 w-5 text-green-500" />
                        Node.js (Recommended)
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Express server for self-hosted deployments. Works with Vercel, Railway, Render.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className={`cursor-not-allowed opacity-50`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value="ssjs" id="ssjs" disabled />
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Code2 className="h-5 w-5 text-blue-500" />
                        SSJS (Coming Soon)
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Server-Side JavaScript for CloudPages. No external hosting needed.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Describe */}
        {step === "describe" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Describe your activity</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Activity Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Slack Notifier, HubSpot Sync"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder={`Describe what your ${projectType === "decision-split" ? "decision split" : "custom activity"} should do. Include:
• What data should come from Journey Builder
• What external APIs to integrate  
• What should happen during execution
• What configuration options users need`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 min-h-[180px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Configure - Review AI Output */}
        {step === "configure" && extractedRequirements && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Review extracted requirements</h2>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Activity Name</Label>
                  <p className="font-medium">{extractedRequirements.activityName}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <p className="capitalize">{extractedRequirements.category}</p>
                </div>

                {extractedRequirements.inArguments?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Input Arguments</Label>
                    <div className="mt-1 space-y-1">
                      {extractedRequirements.inArguments.map((arg: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">{arg.name}</code>
                          <span className="text-muted-foreground">({arg.type})</span>
                          {arg.required && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">required</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extractedRequirements.externalAPIs?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">External APIs</Label>
                    <div className="mt-1 space-y-1">
                      {extractedRequirements.externalAPIs.map((api: any, i: number) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{api.name}</span>
                          <span className="text-muted-foreground"> — {api.authentication}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extractedRequirements.isDecisionSplit && extractedRequirements.outcomes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Decision Outcomes</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {extractedRequirements.outcomes.map((o: any, i: number) => (
                        <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {o.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {extractedRequirements.executionSteps?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Execution Steps</Label>
                    <ol className="mt-1 space-y-2 text-sm">
                      {extractedRequirements.executionSteps.map((step: any) => (
                        <li key={step.order} className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">
                            {step.order}
                          </span>
                          <span>{step.action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Review the extracted requirements above. The AI will use these to generate production-ready code.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 5: Review */}
        {step === "review" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Review and create</h2>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <p className="font-medium flex items-center gap-2">
                      {projectType === "decision-split" ? (
                        <><GitBranch className="h-4 w-4" /> Decision Split</>
                      ) : (
                        <><Zap className="h-4 w-4" /> Custom Activity</>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Stack</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Server className="h-4 w-4" /> {stack === "node" ? "Node.js" : "SSJS"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Activity Name</Label>
                  <p className="font-medium">{extractedRequirements?.activityName || activityName}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm text-muted-foreground">{extractedRequirements?.activityDescription || description}</p>
                </div>

                {projectType === "decision-split" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Outcomes</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(extractedRequirements?.outcomes || outcomes).map((o: any, i: number) => (
                        <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {o.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc ml-4">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Generating State */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Extracting Requirements...</h3>
            <p className="text-muted-foreground">
              AI is analyzing your description and building the activity specification.
            </p>
          </div>
        )}

        {/* Navigation */}
        {step !== "generating" && (
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === "type" || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              variant="gradient"
              onClick={handleNext}
              disabled={loading || (!canCreateActivity() && step === "review") || (!canGenerateAI() && step === "describe")}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === "review" ? (
                <>
                  Create Activity
                  <Check className="h-4 w-4 ml-2" />
                </>
              ) : step === "describe" ? (
                <>
                  Generate Requirements
                  <Sparkles className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NewActivityWizard;
