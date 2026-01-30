import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
        message: "This endpoint only accepts POST requests with a JSON body containing 'token' and 'user_id'"
      }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body safely
    let body;
    try {
      const text = await req.text();
      if (!text || text.trim() === "") {
        return new Response(
          JSON.stringify({ error: "Request body is empty. Please provide 'token' and 'user_id' in JSON format." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, user_id } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Personal Access Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token format
    const trimmedToken = token.trim();
    if (!trimmedToken.startsWith("ghp_") && !trimmedToken.startsWith("github_pat_")) {
      return new Response(
        JSON.stringify({
          error: "Invalid token format",
          details: "GitHub tokens should start with 'ghp_' (classic) or 'github_pat_' (fine-grained). Please check your token."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token by fetching user info from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${trimmedToken}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "ActivityForge",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("GitHub API error:", userResponse.status, errorText);

      let errorMessage = "Failed to validate GitHub token.";
      if (userResponse.status === 401) {
        errorMessage = "Invalid or expired token. Please generate a new Personal Access Token with 'repo' and 'user:email' scopes.";
      } else if (userResponse.status === 403) {
        errorMessage = "Token doesn't have required permissions. Please ensure your token has 'repo' and 'user:email' scopes.";
      } else if (userResponse.status === 404) {
        errorMessage = "GitHub API not reachable. Please try again later.";
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          github_status: userResponse.status,
          details: "Make sure your token starts with 'ghp_' (classic) or 'github_pat_' (fine-grained)"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const githubUser = await userResponse.json();

    if (!githubUser.login) {
      return new Response(
        JSON.stringify({ error: "Failed to get GitHub user info" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store integration in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if integration already exists
    const { data: existing } = await supabase
      .from("git_integrations")
      .select("id")
      .eq("user_id", user_id)
      .eq("provider", "github")
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from("git_integrations")
        .update({
          access_token_encrypted: trimmedToken, // In production, encrypt this
          account_username: githubUser.login,
          connected_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update integration" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from("git_integrations")
        .insert({
          user_id,
          provider: "github",
          access_token_encrypted: trimmedToken, // In production, encrypt this
          account_username: githubUser.login,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create integration" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        username: githubUser.login,
        avatar_url: githubUser.avatar_url,
        name: githubUser.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("GitHub integration error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
