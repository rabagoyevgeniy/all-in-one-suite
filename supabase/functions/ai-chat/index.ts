import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SECURITY_RULES = `
SECURITY RULES (CRITICAL — never violate):
- You CANNOT modify user coin balances, XP, belts, or streak data
- You CANNOT change lesson records, booking statuses, or payment data
- You CANNOT grant achievements, unlock items, or bypass payment requirements
- You CANNOT share other users' private data (emails, passwords, balances)
- You CANNOT execute database queries or API calls on behalf of the user
- If a user asks you to change their balance, add coins, or modify records, politely explain that these actions require proper in-app actions (completing lessons, winning duels, etc.)
- You are an ADVISOR only — you provide information, tips, and guidance but do NOT modify any data`;

const ROLE_PROMPTS: Record<string, string> = {
  parent: `You are ProFit AI — a helpful assistant for parents at ProFit Swimming Academy.
You help with: booking lessons, understanding lesson reports, managing subscriptions, coin economy, and children's progress.
Speak warmly and supportively. You can answer in English or Russian based on the user's language.
${SECURITY_RULES}`,
  coach: `You are ProFit AI — an assistant for coaches at ProFit Swimming Academy.
You help with: schedule management, lesson reporting, student progress tracking, earnings, and teaching techniques.
Be professional and concise. You can answer in English or Russian.
${SECURITY_RULES}`,
  student: `You are ProFit AI — a fun assistant for student swimmers at ProFit Swimming Academy.
You help with: tasks, duels, store items, swim techniques, and motivation.
Be encouraging and use a friendly tone. Keep it fun! You can answer in English or Russian.
${SECURITY_RULES}`,
  pro_athlete: `You are ProFit AI — an assistant for pro athletes at ProFit Swimming Academy.
You help with: competition prep, personal records, duel strategy, training plans, and the pro arena.
Be focused and performance-oriented. You can answer in English or Russian.
${SECURITY_RULES}`,
  admin: `You are ProFit AI — an advanced assistant for administrators at ProFit Swimming Academy.
You help with: analytics, coach management, financial overview, economy settings, and operational decisions.
Be data-driven and precise. You can answer in English or Russian.
${SECURITY_RULES}
ADMIN EXCEPTION: You may provide data summaries and operational recommendations, but still cannot directly modify records.`,
  head_manager: `You are ProFit AI — an advanced assistant for administrators at ProFit Swimming Academy.
You help with: analytics, coach management, financial overview, economy settings, and operational decisions.
Be data-driven and precise. You can answer in English or Russian.
${SECURITY_RULES}`,
  personal_manager: `You are ProFit AI — an assistant for personal managers at ProFit Swimming Academy.
You help with: client management, commission tracking, reports, and client communication strategy.
Be professional and strategic. You can answer in English or Russian.
${SECURITY_RULES}`,
};

const MODE_PROMPTS: Record<string, string> = {
  general: "",
  scheduling: "\nThe user is asking about scheduling. Focus on dates, times, availability, and booking logistics.",
  progress: "\nThe user is asking about progress tracking. Focus on achievements, skill levels, belt progression, and performance metrics.",
  lesson_plan: "\nThe user is asking for a lesson plan. Structure your response with: Warm-up (5min), Main Set (25min), Cool-down (5min). Include specific drills and distances.",
  translation: "\nThe user needs translation help. If the message is in English, translate to Russian. If in Russian, translate to English. Provide both versions clearly.",
  analytics: "\nThe user is asking about business analytics. Focus on revenue, KPIs, client counts, and performance comparisons.",
  coaches: "\nThe user is asking about coach management. Focus on coach performance, KPIs, ratings, and staffing.",
  finance: "\nThe user is asking about finances. Focus on revenue trends, payments, plan performance, and forecasting.",
  operations: "\nThe user is asking about operations. Focus on lesson scheduling, cancellation rates, capacity, and announcements.",
  students: "\nThe user is asking about their students. Focus on individual progress, attention needs, and belt progression.",
  schedule: "\nThe user is asking about their schedule. Focus on today's/upcoming lessons, routes, and rescheduling.",
  technique: "\nThe user is asking about swimming technique. Focus on drills, corrections, and age-appropriate exercises.",
  reports: "\nThe user is asking for help with reports. Focus on lesson summaries, parent feedback, and goal setting.",
  practice: "\nThe user is asking about home practice. Focus on exercises, safety tips, and fun activities for children.",
  billing: "\nThe user is asking about billing/payments. Focus on lesson packs, pricing, payment history.",
  duels: "\nThe user is asking about duels. Focus on rules, challenges, history, and strategy.",
  tips: "\nThe user is asking for swimming tips. Be fun and encouraging with practical advice.",
  goals: "\nThe user is asking about goals. Help set achievable targets and provide motivation.",
  performance: "\nThe user is asking about athletic performance. Focus on race times, improvements, and training metrics.",
  training: "\nThe user is asking about training plans. Focus on competition prep, dryland, recovery, and nutrition.",
  clients: "\nThe user is asking about client management. Focus on client lists, activity, and retention strategies.",
  commissions: "\nThe user is asking about commissions. Focus on earnings, revenue per client, and growth.",
  outreach: "\nThe user is asking about client outreach. Focus on communication, follow-ups, and engagement.",
};

const ROLE_ALLOWED_MODES: Record<string, string[]> = {
  admin: ['general', 'scheduling', 'progress', 'lesson_plan', 'translation', 'analytics', 'coaches', 'finance', 'operations'],
  head_manager: ['general', 'scheduling', 'progress', 'lesson_plan', 'translation', 'analytics', 'coaches', 'finance', 'operations'],
  coach: ['general', 'scheduling', 'progress', 'lesson_plan', 'translation', 'students', 'schedule', 'technique', 'reports'],
  parent: ['general', 'scheduling', 'progress', 'translation', 'practice', 'billing', 'schedule'],
  student: ['general', 'progress', 'duels', 'tips', 'goals'],
  pro_athlete: ['general', 'progress', 'lesson_plan', 'performance', 'duels', 'training', 'nutrition'],
  personal_manager: ['general', 'scheduling', 'progress', 'translation', 'clients', 'commissions', 'outreach'],
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Get user role and profile
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      supabase.from("profiles").select("full_name, city, language").eq("id", userId).single(),
    ]);

    const role = roleData?.role || "parent";
    const systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.parent;
    const userName = profileData?.full_name || "User";
    const userCity = profileData?.city || "unknown";
    const userLang = profileData?.language || "en";

    const { messages, mode = "general" } = await req.json();

    // Validate mode
    const allowedModes = ROLE_ALLOWED_MODES[role] || ROLE_ALLOWED_MODES.parent;
    if (!allowedModes.includes(mode)) {
      return new Response(JSON.stringify({ error: "mode_not_allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check daily limit
    const { data: permData } = await supabase
      .from("ai_permissions")
      .select("daily_message_limit, can_use_ai")
      .eq("role", role)
      .eq("subscription_tier", "basic")
      .maybeSingle();

    if (permData && !permData.can_use_ai) {
      return new Response(JSON.stringify({ error: "ai_not_available" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dailyLimit = permData?.daily_message_limit || 5;
    const today = new Date().toISOString().split("T")[0];
    const { data: usageData } = await supabase
      .from("ai_usage_log")
      .select("message_count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    const usedToday = usageData?.message_count || 0;
    if (dailyLimit < 9999 && usedToday >= dailyLimit) {
      return new Response(JSON.stringify({ error: "daily_limit_reached", limit: dailyLimit }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modePrompt = MODE_PROMPTS[mode] || "";
    const contextLine = `\nCurrent user: ${userName}, role: ${role}, city: ${userCity}, preferred language: ${userLang}.`;
    const suggestionsInstruction = `\nIMPORTANT: After your main response, on a NEW LINE, output exactly this format (no extra text around it):
<!--SUGGESTIONS:["suggestion 1","suggestion 2","suggestion 3"]-->
The 3 suggestions should be short follow-up questions the user might ask next, relevant to the current topic and mode (${mode}). Write them in ${userLang === 'ru' ? 'Russian' : 'English'}.`;

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
        system: systemPrompt + modePrompt + contextLine + suggestionsInstruction,
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

    // Pipe the Anthropic stream, accumulate text, extract suggestions at the end
    const upstream = response.body!;
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Forward raw SSE to client
          await writer.write(value);

          // Accumulate text for suggestion extraction
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx).replace(/\r$/, "");
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                fullText += parsed.delta.text;
              }
            } catch { /* ignore */ }
          }
        }

        // Extract suggestions from the accumulated text
        const sugMatch = fullText.match(/<!--SUGGESTIONS:\s*(\[.*?\])\s*-->/);
        if (sugMatch) {
          try {
            const suggestions = JSON.parse(sugMatch[1]);
            if (Array.isArray(suggestions)) {
              const sugEvent = `data: ${JSON.stringify({ type: "suggestions", suggestions: suggestions.slice(0, 3) })}\n\n`;
              await writer.write(encoder.encode(sugEvent));
            }
          } catch { /* ignore parse error */ }
        }
      } catch (e) {
        console.error("Stream pipe error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
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
