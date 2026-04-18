import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const BASE_CONTEXT = `
You are ProFit AI — the intelligent assistant of ProFit Swimming Academy.
ProFit is a premium traveling-coach swimming school operating in Dubai (AED) and Baku (AZN).
Coaches travel to clients' private pools. No fixed location.
Swim cap progression: White → Sky Blue → Green → Yellow → Orange → Red → Black.
Coins (ProFit Coins) are the internal reward currency.
Always respond in the SAME language the user writes in (English or Russian).
Be concise, friendly, and professional. Use markdown sparingly.

SECURITY RULES (never violate):
- You CANNOT modify user coin balances, XP, swim caps, or streaks.
- You CANNOT change lesson records, booking statuses, or payment data.
- You CANNOT grant achievements, unlock items, or bypass payments.
- You CANNOT share other users' private data.
- You are an ADVISOR — provide information, tips, and guidance only.
`

const SUGGESTIONS_INSTRUCTION = `
After your main answer, on new lines, output exactly this block:
[SUGGESTIONS]
1. <short follow-up question>
2. <deeper follow-up question>
3. <related topic question>
[/SUGGESTIONS]
Write the suggestions in the same language as your main answer.`

const ROLE_PROMPTS: Record<string, string> = {
  admin: `You are assisting the ADMIN/Director of ProFit. Executive-level, data-driven, decisive. Focus on analytics, revenue, coach management, and operations.`,
  head_manager: `You are assisting the HEAD MANAGER of ProFit. Executive-level, strategic. Focus on analytics, operations, staffing and growth.`,
  coach: `You are assisting a COACH at ProFit. Scope: only your own students, schedule, earnings. Be concise — coach is often in the field.`,
  parent: `You are assisting a PARENT at ProFit. Be warm, reassuring, parent-friendly. Help with bookings, progress tracking, payments, and home practice tips.`,
  student: `You are assisting a STUDENT swimmer. Be energetic, fun, and motivating! Make swimming an adventure. Use emojis sparingly to keep it friendly.`,
  pro_athlete: `You are assisting a PROFESSIONAL ATHLETE. Be focused and performance-oriented. Help with race strategy, personal records, training plans, and duel strategy.`,
  personal_manager: `You are assisting a PERSONAL MANAGER (client acquisition and retention). Be strategic and professional. Focus on client communication, retention, commissions, and schedule.`,
  freelancer: `You are assisting a FREELANCE COACH at ProFit's marketplace. Focus on incoming requests, scheduling, earnings, and client communication. Be professional and proactive.`,
}

const MODE_HINTS: Record<string, string> = {
  general: '',
  analytics: '\nThe user is asking about business analytics. Focus on revenue, KPIs, client counts, and period comparisons.',
  coaches: '\nThe user is asking about coach management. Focus on coach performance, ratings, and staffing.',
  finance: '\nThe user is asking about finances. Focus on revenue trends, payments, plan performance, and forecasting.',
  operations: '\nThe user is asking about operations. Focus on lesson scheduling, cancellation rates, capacity, and announcements.',
  scheduling: '\nThe user is asking about scheduling. Focus on dates, times, availability, and booking logistics.',
  lesson_plan: '\nThe user is asking for a lesson plan. Structure: Warm-up (5min) → Main Set (25min) → Cool-down (5min). Include specific drills and distances.',
  translation: '\nThe user needs translation help. If message is in English, translate to Russian and vice versa. Show both clearly.',
  students: '\nThe user is asking about their students. Focus on individual progress, attention needs, and swim cap progression.',
  schedule: "\nThe user is asking about their schedule. Focus on today's / upcoming lessons, routes, and rescheduling.",
  technique: '\nThe user is asking about swimming technique. Focus on drills, corrections, and age-appropriate exercises.',
  reports: '\nThe user is asking for help with reports. Focus on lesson summaries, parent feedback, and goal setting.',
  progress: '\nThe user is asking about progress tracking. Focus on achievements, swim cap progression, XP, and skills.',
  practice: '\nThe user is asking about home practice. Focus on safe at-home drills and fun activities.',
  billing: '\nThe user is asking about billing. Focus on lesson packs, pricing, and payment history.',
  duels: '\nThe user is asking about duels. Focus on rules, strategy, history, and matchmaking.',
  tips: '\nThe user is asking for swimming tips. Be fun and encouraging with practical advice.',
  goals: '\nThe user is asking about goals. Help set achievable targets and motivate.',
  performance: '\nThe user is asking about athletic performance. Focus on race times, improvements, and training metrics.',
  training: '\nThe user is asking about training plans. Focus on competition prep, dryland, recovery, and nutrition.',
  clients: '\nThe user is asking about client management. Focus on client lists, activity, and retention strategies.',
  commission: '\nThe user is asking about commissions. Focus on earnings, revenue per client, and growth.',
  commissions: '\nThe user is asking about commissions. Focus on earnings, revenue per client, and growth.',
  outreach: '\nThe user is asking about client outreach. Focus on communication, follow-ups, and engagement.',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, city, language')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role || 'parent'
    const userName = profile?.full_name || 'User'
    const userCity = profile?.city || 'Dubai'
    const userLang = profile?.language || 'en'

    const body = await req.json().catch(() => ({}))
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const mode: string = typeof body?.mode === 'string' ? body.mode : 'general'

    // Pick best permissions row for this role. Prefer 'basic', fall back to highest-limit.
    const { data: permRows } = await supabase
      .from('ai_permissions')
      .select('subscription_tier, can_use_ai, daily_message_limit, allowed_modes')
      .eq('role', role)

    const perm = (() => {
      const rows = permRows ?? []
      if (rows.length === 0) return null
      const basic = rows.find((r: any) => r.subscription_tier === 'basic')
      if (basic) return basic
      return [...rows].sort((a: any, b: any) => (b.daily_message_limit ?? 0) - (a.daily_message_limit ?? 0))[0]
    })()

    if (perm && perm.can_use_ai === false) {
      return new Response(JSON.stringify({ error: 'ai_not_available' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const allowed: string[] = perm?.allowed_modes ?? ['general']
    if (allowed.length > 0 && !allowed.includes(mode) && mode !== 'general') {
      return new Response(JSON.stringify({ error: 'mode_not_allowed', allowed }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const dailyLimit: number = perm?.daily_message_limit ?? 5

    // Daily usage check (ai_usage_log).
    const today = new Date().toISOString().split('T')[0]
    const { data: usageRow } = await supabase
      .from('ai_usage_log')
      .select('id, message_count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle()

    const used = usageRow?.message_count ?? 0
    if (dailyLimit < 9999 && used >= dailyLimit) {
      return new Response(JSON.stringify({ error: 'daily_limit_reached', limit: dailyLimit }), {
        status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const basePrompt = ROLE_PROMPTS[role] ?? ROLE_PROMPTS.parent
    const modeHint = MODE_HINTS[mode] ?? ''
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const systemPrompt =
      BASE_CONTEXT + '\n' +
      basePrompt +
      modeHint +
      `\n\n👤 USER: ${userName} | role: ${role} | city: ${userCity} | language: ${userLang}` +
      `\n📅 Today: ${todayStr}` +
      SUGGESTIONS_INSTRUCTION

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: messages.slice(-10).map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content ?? ''),
        })),
      }),
    })

    if (!aiRes.ok) {
      const txt = await aiRes.text()
      console.error('Anthropic error:', aiRes.status, txt)
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again shortly.' }), {
          status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiRes.json()
    const rawText: string = aiData?.content?.[0]?.text || 'Sorry, I could not generate a response.'

    const sugMatch = rawText.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/)
    let content = rawText
    let suggestions: string[] = []
    if (sugMatch) {
      content = rawText.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, '').trim()
      suggestions = sugMatch[1]
        .split('\n')
        .map((l: string) => l.replace(/^[\-\*\d]+[\.\)\s]*/, '').trim())
        .filter((l: string) => l.length > 3)
        .slice(0, 3)
    }

    return new Response(
      JSON.stringify({
        content,
        suggestions,
        role_context: {
          role,
          allowed_modes: allowed,
          daily_limit: dailyLimit,
          messages_used_today: used + 1,
        },
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('ai-chat fatal:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
