import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// SFMC RULES - Injected into every prompt
// ============================================================================
const SFMC_RULES = `
## SFMC Custom Activity Rules (MANDATORY)

You MUST follow these rules exactly. Violation will cause the activity to fail.

### config.json Rules
1. workflowApiVersion MUST be "1.1"
2. type MUST be "REST" for standard activities or "RestDecision" for decision splits
3. All URLs must use {{BASE_URL}} placeholder
4. arguments.execute.inArguments must use Journey Builder syntax: {{Contact.Attribute.FieldName}}
5. outcomes are REQUIRED for RestDecision type and MUST have at least 2 outcomes
6. Each outcome MUST have: key (lowercase_snake_case), metaData.label, and arguments.branchResult

### Server Rules (Node.js)
1. Express server MUST implement POST endpoints: /execute, /save, /publish, /validate
2. /execute MUST return valid JSON with outArguments or branchResult
3. For RestDecision, /execute MUST return { branchResult: "outcome_key" }
4. NEVER hardcode API keys - use environment variables
5. Include proper error handling and logging

### Client Rules (customActivity.js)
1. MUST use Postmonger for Journey Builder communication
2. MUST handle: initActivity, clickedNext, clickedBack events
3. MUST call connection.trigger('updateActivity', payload) to save
4. MUST set metaData.isConfigured = true when configuration is complete

### DO NOT
- Do not invent field names not specified in requirements
- Do not use deprecated API versions
- Do not hardcode any credentials or API keys
- Do not guess about SFMC data binding syntax
`;

// ============================================================================
// EXTRACTION SCHEMA - Strict contract for AI output
// ============================================================================
const EXTRACTION_SCHEMA = `
## Required Output Schema

Return a JSON object with this EXACT structure:

{
  "activityName": "string (max 50 chars)",
  "activityDescription": "string (max 200 chars)",
  "category": "message" | "customer" | "flow" | "custom",
  "inArguments": [
    {
      "name": "string (valid JS identifier, camelCase)",
      "type": "string" | "number" | "boolean",
      "source": "Contact.Attribute.FieldName",
      "required": true | false,
      "description": "string"
    }
  ],
  "outArguments": [
    {
      "name": "string (valid JS identifier)",
      "type": "string" | "number" | "boolean",
      "description": "string"
    }
  ],
  "externalAPIs": [
    {
      "name": "string",
      "baseUrl": "string (optional)",
      "authentication": "none" | "api-key" | "oauth" | "webhook" | "bearer",
      "envVarName": "string (UPPERCASE_WITH_UNDERSCORES)"
    }
  ],
  "configurationSteps": [
    {
      "label": "string",
      "fields": [
        {
          "name": "string (valid JS identifier)",
          "type": "text" | "textarea" | "select" | "checkbox" | "number" | "url",
          "label": "string",
          "placeholder": "string (optional)",
          "required": true | false,
          "options": [{"value": "string", "label": "string"}]
        }
      ]
    }
  ],
  "isDecisionSplit": true | false,
  "outcomes": [
    {
      "key": "lowercase_snake_case",
      "label": "Human Readable Label",
      "condition": "Description of when this outcome triggers"
    }
  ],
  "executionSteps": [
    {
      "order": 1,
      "action": "string",
      "details": "string"
    }
  ]
}
`;

interface GenerateRequest {
  prompt: string;
  activityName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, activityName } = await req.json() as GenerateRequest;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt with schema and rules
    const systemPrompt = `You are an expert Salesforce Marketing Cloud Custom Activity architect.
Your task is to analyze a user's natural language description and extract precise, structured requirements.

${SFMC_RULES}

${EXTRACTION_SCHEMA}

## Critical Instructions
- Return ONLY valid JSON, no markdown code blocks, no explanations
- Use exact field names and types as specified in the schema
- For inArguments source, use proper SFMC data binding syntax: Contact.Attribute.FieldName
- If the user mentions a decision, split, or multiple paths, set isDecisionSplit to true
- For decision splits, ALWAYS include at least 2 outcomes
- Generate realistic, production-ready configurations
- Every configuration field must have a valid camelCase name`;

    const userPrompt = `User Description: ${prompt}
${activityName ? `Suggested Activity Name: ${activityName}` : ''}

Analyze this request and return ONLY the structured requirements JSON. No markdown, no explanations.`;

    console.log("Calling Lovable AI Gateway for requirement extraction...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2, // Low temperature for structured output
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate requirements" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "AI returned empty response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from the response (handle markdown code blocks if present)
    let requirements;
    try {
      let jsonString = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonString.includes("```json")) {
        jsonString = jsonString.split("```json")[1].split("```")[0].trim();
      } else if (jsonString.includes("```")) {
        jsonString = jsonString.split("```")[1].split("```")[0].trim();
      }
      
      requirements = JSON.parse(jsonString);
      
      // Validate required fields
      const validationErrors = validateRequirements(requirements);
      if (validationErrors.length > 0) {
        console.warn("Validation warnings:", validationErrors);
        // Attempt to fix common issues
        requirements = fixCommonIssues(requirements);
      }
      
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError, content);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse AI response. Please try again with a clearer description.",
          raw: content.substring(0, 500) 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully extracted requirements:", requirements.activityName);

    return new Response(
      JSON.stringify({ requirements }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-activity:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// Validation & Fixing Functions
// ============================================================================

function validateRequirements(req: any): string[] {
  const errors: string[] = [];
  
  if (!req.activityName) errors.push("Missing activityName");
  if (!req.activityDescription) errors.push("Missing activityDescription");
  if (!req.category) errors.push("Missing category");
  
  // Validate decision split has outcomes
  if (req.isDecisionSplit && (!req.outcomes || req.outcomes.length < 2)) {
    errors.push("Decision split requires at least 2 outcomes");
  }
  
  // Validate inArguments have proper format
  if (req.inArguments) {
    for (const arg of req.inArguments) {
      if (!arg.name || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(arg.name)) {
        errors.push(`Invalid inArgument name: ${arg.name}`);
      }
    }
  }
  
  // Validate configuration fields
  if (req.configurationSteps) {
    for (const step of req.configurationSteps) {
      if (!step.fields || step.fields.length === 0) {
        errors.push(`Configuration step "${step.label}" has no fields`);
      }
    }
  }
  
  return errors;
}

function fixCommonIssues(req: any): any {
  const fixed = { ...req };
  
  // Ensure category is valid
  const validCategories = ["message", "customer", "flow", "custom"];
  if (!validCategories.includes(fixed.category)) {
    fixed.category = "custom";
  }
  
  // Fix inArgument sources
  if (fixed.inArguments) {
    fixed.inArguments = fixed.inArguments.map((arg: any) => ({
      ...arg,
      source: arg.source || `Contact.Attribute.${arg.name}`,
      type: arg.type || "string",
      required: arg.required ?? true,
    }));
  }
  
  // Ensure outcomes for decision splits
  if (fixed.isDecisionSplit && (!fixed.outcomes || fixed.outcomes.length < 2)) {
    fixed.outcomes = [
      { key: "outcome_yes", label: "Yes", condition: "When condition is met" },
      { key: "outcome_no", label: "No", condition: "When condition is not met" },
    ];
  }
  
  // Fix outcome keys to be lowercase
  if (fixed.outcomes) {
    fixed.outcomes = fixed.outcomes.map((o: any) => ({
      ...o,
      key: o.key?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 
           o.label?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') ||
           'outcome',
    }));
  }
  
  // Ensure configurationSteps is an array
  if (!Array.isArray(fixed.configurationSteps)) {
    fixed.configurationSteps = [];
  }
  
  // Ensure executionSteps is an array
  if (!Array.isArray(fixed.executionSteps)) {
    fixed.executionSteps = [];
  }
  
  return fixed;
}
