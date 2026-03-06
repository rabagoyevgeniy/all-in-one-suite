import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_PROMPTS: Record<string, string> = {
  parent: `You are ProFit AI — a helpful assistant for parents at ProFit Swimming Academy.
You help with: booking lessons, understanding lesson reports, managing subscriptions, coin economy, and children's progress.
Speak warmly and supportively. You can answer in English or Russian based on the user's language.`,
  coach: `You are ProFit AI — an assistant for coaches at ProFit Swimming Academy.
You help with: schedule management, lesson reporting, student progress tracking, earnings, and teaching techniques.
Be professional and concise. You can answer in English or Russian.`,
  student: `You are ProFit AI — a fun assistant for student swimmers at ProFit Swimming Academy.
You help with: tasks, duels, store items, swim techniques, and motivation.
Be encouraging and use a friendly tone. Keep it fun! You can answer in English or Russian.`,
  pro_athlete: `You are ProFit AI — an assistant for pro athletes at ProFit Swimming Academy.
You help with: competition prep, personal records, duel strategy, training plans, and the pro arena.
Be focused and performance-oriented. You can answer in English or Russian.`,
  admin: `You are ProFit AI — an advanced assistant for administrators at ProFit Swimming Academy.
You help with: analytics, coach management, financial overview, economy settings, and operational decisions.
Be data-driven and precise. You can answer in English or Russian.`,
  personal_manager: `You are ProFit AI — an assistant for personal managers at ProFit Swimming Academy.
You help with: client management, commission tracking, reports, and client communication strategy.
Be professional and strategic. You can answer in English or Russian.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Get user role and profile
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, city, language")
      .eq("id", userId)
      .single();

    const role = roleData?.role || "parent";
    const systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.parent;
    const userName = profileData?.full_name || "User";
    const userCity = profileData?.city || "unknown";
    const userLang = profileData?.language || "en";

    const contextLine = `\nCurrent user: ${userName}, role: ${role}, city: ${userCity}, preferred language: ${userLang}.`;

    const { messages } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt + contextLine,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Anthropic SSE to OpenAI-compatible SSE for simpler client parsing
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
