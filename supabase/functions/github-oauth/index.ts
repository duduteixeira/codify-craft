import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple encryption/decryption for tokens using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const ENCRYPTION_SECRET = Deno.env.get("ENCRYPTION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 32);
  if (!ENCRYPTION_SECRET || ENCRYPTION_SECRET.length < 32) {
    throw new Error("Invalid encryption key");
  }
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENCRYPTION_SECRET.slice(0, 32));
  
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptToken(token: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  
  // Combine IV + encrypted data and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    // If decryption fails, assume it's a plain text token (backwards compatibility)
    return encryptedToken;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const body = await req.json();
    const { token, user_id, action } = body;

    // Handle token retrieval for other functions
    if (action === "get_token") {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: integration } = await supabase
        .from("git_integrations")
        .select("access_token_encrypted")
        .eq("user_id", user_id)
        .eq("provider", "github")
        .maybeSingle();

      if (!integration?.access_token_encrypted) {
        return new Response(
          JSON.stringify({ error: "No GitHub integration found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const decryptedToken = await decryptToken(integration.access_token_encrypted);
      
      return new Response(
        JSON.stringify({ token: decryptedToken }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle token storage (connect flow)
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Personal Access Token is required" }),
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
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "ActivityForge",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("GitHub API error:", userResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Invalid token or GitHub API error. Please check your token and try again." }),
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

    // Encrypt the token before storing
    const encryptedToken = await encryptToken(token);

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
          access_token_encrypted: encryptedToken,
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
          access_token_encrypted: encryptedToken,
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
