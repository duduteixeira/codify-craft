import { 
  Sparkles, 
  Code2, 
  GitBranch, 
  Rocket, 
  Shield, 
  BarChart3,
  Zap,
  FileJson
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description: "Describe your integration in natural language. Claude AI extracts requirements and generates complete, production-ready code.",
    gradient: "from-purple-500 to-primary",
  },
  {
    icon: Code2,
    title: "Dual Version Output",
    description: "Get both JavaScript (client-side) and Node.js (server-side) versions of your Custom Activity, ready for any deployment scenario.",
    gradient: "from-primary to-accent",
  },
  {
    icon: FileJson,
    title: "Complete Config Files",
    description: "Auto-generated config.json with proper inArguments, outArguments, endpoints, and UI wizard steps.",
    gradient: "from-accent to-emerald-500",
  },
  {
    icon: GitBranch,
    title: "Git Integration",
    description: "Connect to GitHub, GitLab, or Bitbucket. Your generated code is automatically committed and ready for version control.",
    gradient: "from-emerald-500 to-primary",
  },
  {
    icon: Rocket,
    title: "One-Click Deploy",
    description: "Deploy instantly to Vercel, Render, Railway, or Heroku. Get live URLs in minutes, not hours.",
    gradient: "from-primary to-purple-500",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Security",
    description: "Enterprise-grade security with tenant isolation, encrypted secrets, and role-based access control.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: BarChart3,
    title: "Execution Monitoring",
    description: "Track activity executions, view logs, monitor performance, and get alerts for failures.",
    gradient: "from-pink-500 to-accent",
  },
  {
    icon: Zap,
    title: "External API Integration",
    description: "Connect to any REST API. The AI understands authentication methods (OAuth, API keys, Basic) and generates proper integration code.",
    gradient: "from-accent to-primary",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 hero-gradient opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Build
            <span className="text-gradient"> Custom Activities</span>
          </h2>
          <p className="text-muted-foreground">
            From AI-powered code generation to automated deployment, we've got you covered.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative p-6 rounded-xl bg-card border border-border card-hover"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="relative mb-4">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-lg blur-lg opacity-20 group-hover:opacity-40 transition-opacity`} />
                <div className={`relative w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} p-0.5`}>
                  <div className="w-full h-full bg-card rounded-[7px] flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
