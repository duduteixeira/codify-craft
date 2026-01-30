import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, GitBranch, Rocket } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      {/* Floating Elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Powered by <span className="text-primary font-medium">Claude AI</span>
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-slide-up">
            Build SFMC Custom Activities
            <br />
            <span className="text-gradient">with AI in Minutes</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Describe your integration in plain language. Our AI generates production-ready 
            Custom Activities for Salesforce Marketing Cloud, complete with code, configs, and one-click deployment.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth/signup" className="gap-2">
                Start Building Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm">AI-Powered Generation</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
              <GitBranch className="h-4 w-4 text-primary" />
              <span className="text-sm">Git Integration</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="text-sm">One-Click Deploy</span>
            </div>
          </div>
        </div>

        {/* Preview Window */}
        <div className="mt-20 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="relative rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {/* Window Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs text-muted-foreground font-code">ActivityForge — AI Prompt Builder</span>
              </div>
            </div>
            
            {/* Window Content */}
            <div className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Prompt Input */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Describe your activity</span>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground font-code leading-relaxed">
                    <span className="text-primary">&gt;</span> I need a custom activity that sends customer data to 
                    <span className="text-accent"> Slack</span> when they enter a journey. It should include 
                    their email, name, and purchase history from the data extension...
                  </div>
                </div>
                
                {/* Generated Output Preview */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Generated config.json</span>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border font-code text-xs leading-relaxed overflow-hidden">
                    <pre className="text-muted-foreground">
{`{
  "workflowApiVersion": "1.1",
  "metaData": {
    "icon": "images/icon.png",
    "category": "message"
  },
  "type": "REST",
  "lang": {
    "en-US": {
      "name": "Slack Notifier",
      "description": "Send to Slack"
    }
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-primary opacity-10 blur-3xl -z-10 rounded-3xl" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
