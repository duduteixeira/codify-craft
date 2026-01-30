import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateRequest {
  prompt: string;
  activityName?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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

    const systemPrompt = `You are an expert in Salesforce Marketing Cloud Journey Builder Custom Activities.
Your task is to analyze a user's natural language description and extract structured requirements.

Extract the following information:
1. Activity name and description
2. Category (message, customer, flow, or custom)
3. Input arguments from Journey Builder (with data binding syntax like {{Contact.Attribute.EmailAddress}})
4. Output arguments to return
5. External APIs to integrate (with authentication details)
6. Step-by-step execution logic
7. Configuration UI fields
8. Whether it's a decision split (RestDecision) with outcomes

Return ONLY valid JSON following this exact structure:
{
  "activityName": "string",
  "activityDescription": "string",
  "category": "message|customer|flow|custom",
  "inArguments": [{"name": "string", "type": "string", "source": "string", "required": boolean}],
  "outArguments": [{"name": "string", "type": "string", "description": "string"}],
  "externalAPIs": [{"name": "string", "baseUrl": "string", "authentication": "none|api-key|oauth|webhook"}],
  "executionSteps": [{"order": number, "action": "string", "details": "string"}],
  "configurationSteps": [{"label": "string", "fields": [{"name": "string", "type": "string", "label": "string", "required": boolean}]}],
  "isDecisionSplit": boolean,
  "outcomes": [{"name": "string", "condition": "string"}]
}`;

    const userPrompt = `User Description: ${prompt}
${activityName ? `Activity Name: ${activityName}` : ''}

Please analyze this and return the structured requirements as JSON.`;

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
        temperature: 0.3,
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

    // Parse JSON from the response (handle markdown code blocks)
    let requirements;
    try {
      let jsonString = content;
      if (content.includes("```json")) {
        jsonString = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```")) {
        jsonString = content.split("```")[1].split("```")[0].trim();
      }
      requirements = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError, content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: content }),
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
