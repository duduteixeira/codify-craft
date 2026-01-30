import { MessageSquare, Cpu, Code2, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Describe Your Activity",
    description: "Write in plain language what your Custom Activity should do. Include data sources, external APIs, and execution logic.",
    example: '"Send a Slack message with customer name and email when they enter the journey..."',
  },
  {
    number: "02",
    icon: Cpu,
    title: "AI Processes Requirements",
    description: "Claude AI analyzes your description, extracts structured requirements, identifies data bindings, and plans the integration architecture.",
    example: "Extracts: inArguments, outArguments, API endpoints, authentication...",
  },
  {
    number: "03",
    icon: Code2,
    title: "Code Generation",
    description: "Production-ready code is generated including config.json, UI templates, server endpoints, and all necessary files for both JS and Node.js versions.",
    example: "Creates: config.json, index.html, execute.js, save.js, publish.js...",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Deploy & Use",
    description: "Push to Git, deploy with one click, and get your live URLs. Register in Marketing Cloud and start using your Custom Activity immediately.",
    example: "Live at: https://your-activity.vercel.app",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            From Idea to Deployed Activity in
            <span className="text-gradient"> 4 Simple Steps</span>
          </h2>
          <p className="text-muted-foreground">
            No more manual coding, configuration headaches, or deployment struggles.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto relative">
          {/* Connecting Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-accent/50 to-primary/50 hidden md:block" />
          
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative flex items-start gap-6 md:gap-12 mb-12 last:mb-0 ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Step Number & Icon */}
              <div className="flex-shrink-0 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity" />
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">{step.number}</span>
                </div>
              </div>

              {/* Content */}
              <div className={`flex-1 ${index % 2 === 0 ? "md:text-left" : "md:text-right"}`}>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground mb-3">{step.description}</p>
                <div className="inline-block px-4 py-2 rounded-lg bg-muted/50 border border-border font-code text-xs text-muted-foreground">
                  {step.example}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
