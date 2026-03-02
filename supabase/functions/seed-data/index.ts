import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: string[] = [];

  try {
    // ===================== 1. CREATE USERS =====================
    const users = [
      { email: "admin@profitswimming.ae", password: "Admin2026!", full_name: "Sultan Al-Rashid", role: "admin", city: "dubai" },
      { email: "coach1@profitswimming.ae", password: "Coach2026!", full_name: "Marco Rodriguez", role: "coach", city: "dubai" },
      { email: "coach2@profitswimming.ae", password: "Coach2026!", full_name: "Elena Petrov", role: "coach", city: "baku" },
      { email: "parent1@test.com", password: "Parent2026!", full_name: "Ahmed Hassan", role: "parent", city: "dubai" },
      { email: "parent2@test.com", password: "Parent2026!", full_name: "Leyla Mammadova", role: "parent", city: "baku" },
      { email: "student1@test.com", password: "Student2026!", full_name: "Omar Hassan", role: "student", city: "dubai" },
      { email: "student2@test.com", password: "Student2026!", full_name: "Aydan Mammadov", role: "student", city: "baku" },
      { email: "proathlete1@test.com", password: "ProAth2026!", full_name: "Rashid Al-Maktoum", role: "pro_athlete", city: "dubai" },
      { email: "pm1@profitswimming.ae", password: "Manager2026!", full_name: "Fatima Aliyeva", role: "personal_manager", city: "dubai" },
    ];

    const userIds: Record<string, string> = {};

    for (const u of users) {
      // Check if user exists by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
      
      if (existing) {
        userIds[u.email] = existing.id;
        // Update app_metadata with role
        await supabase.auth.admin.updateUserById(existing.id, {
          app_metadata: { role: u.role },
          user_metadata: { full_name: u.full_name, role: u.role },
        });
        results.push(`User ${u.email} already exists (${existing.id}), updated metadata`);
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          app_metadata: { role: u.role },
          user_metadata: { full_name: u.full_name, role: u.role },
        });
        if (error) {
          results.push(`FAILED to create ${u.email}: ${error.message}`);
          continue;
        }
        userIds[u.email] = data.user.id;
        results.push(`Created user ${u.email} (${data.user.id})`);
      }

      // Upsert profile
      const uid = userIds[u.email];
      if (uid) {
        await supabase.from("profiles").upsert({
          id: uid,
          full_name: u.full_name,
          city: u.city,
          phone: u.email.includes("profitswimming") ? "+971-50-" + Math.floor(1000000 + Math.random() * 9000000) : "+994-50-" + Math.floor(1000000 + Math.random() * 9000000),
          is_active: true,
        }, { onConflict: "id" });

        // Upsert user_role
        await supabase.from("user_roles").upsert({
          user_id: uid,
          role: u.role,
        }, { onConflict: "user_id,role" });
      }
    }

    const adminId = userIds["admin@profitswimming.ae"];
    const coach1Id = userIds["coach1@profitswimming.ae"];
    const coach2Id = userIds["coach2@profitswimming.ae"];
    const parent1Id = userIds["parent1@test.com"];
    const parent2Id = userIds["parent2@test.com"];
    const student1Id = userIds["student1@test.com"];
    const student2Id = userIds["student2@test.com"];
    const proId = userIds["proathlete1@test.com"];
    const pmId = userIds["pm1@profitswimming.ae"];

    // ===================== 2. ROLE-SPECIFIC RECORDS =====================
    
    // Coaches
    if (coach1Id) {
      await supabase.from("coaches").upsert({
        id: coach1Id,
        rank: "senior",
        avg_rating: 4.7,
        total_lessons_completed: 234,
        coin_balance: 3200,
        hourly_rate_aed: 150,
        hourly_rate_azn: 50,
        specializations: ["freestyle", "backstroke", "kids"],
        bio: "15+ years teaching kids and adults. Former competitive swimmer.",
        is_available_for_seconding: true,
      }, { onConflict: "id" });
      results.push("Upserted coach1");
    }
    if (coach2Id) {
      await supabase.from("coaches").upsert({
        id: coach2Id,
        rank: "elite",
        avg_rating: 4.9,
        total_lessons_completed: 412,
        coin_balance: 8900,
        hourly_rate_aed: 200,
        hourly_rate_azn: 70,
        specializations: ["butterfly", "medley", "competition"],
        bio: "Former Olympic team member. Specializes in competitive training.",
        has_rayban_meta: true,
        is_available_for_seconding: true,
      }, { onConflict: "id" });
      results.push("Upserted coach2");
    }

    // Parents
    if (parent1Id) {
      await supabase.from("parents").upsert({
        id: parent1Id,
        loyalty_rank: "champion",
        coin_balance: 1850,
        total_coins_earned: 4200,
        subscription_tier: "premium",
        personal_manager_id: pmId || null,
        video_consent: true,
        referral_code: "AHMED2026",
      }, { onConflict: "id" });
      results.push("Upserted parent1");
    }
    if (parent2Id) {
      await supabase.from("parents").upsert({
        id: parent2Id,
        loyalty_rank: "loyal",
        coin_balance: 420,
        total_coins_earned: 1100,
        subscription_tier: "standard",
        video_consent: true,
        referral_code: "LEYLA2026",
      }, { onConflict: "id" });
      results.push("Upserted parent2");
    }

    // Students
    if (student1Id) {
      await supabase.from("students").upsert({
        id: student1Id,
        parent_id: parent1Id || null,
        swim_belt: "green",
        coin_balance: 2300,
        total_coins_earned: 5600,
        wins: 5,
        losses: 2,
        current_streak: 7,
        longest_streak: 12,
        age_group: "8-12",
        date_of_birth: "2016-03-15",
      }, { onConflict: "id" });
      results.push("Upserted student1");
    }
    if (student2Id) {
      await supabase.from("students").upsert({
        id: student2Id,
        parent_id: parent2Id || null,
        swim_belt: "sky_blue",
        coin_balance: 850,
        total_coins_earned: 2100,
        wins: 2,
        losses: 1,
        current_streak: 3,
        longest_streak: 5,
        age_group: "8-12",
        date_of_birth: "2017-07-22",
      }, { onConflict: "id" });
      results.push("Upserted student2");
    }

    // Pro Athlete
    if (proId) {
      await supabase.from("pro_athletes").upsert({
        id: proId,
        pro_tier: "silver",
        pro_rating_points: 1450,
        wins: 28,
        losses: 9,
        win_streak: 4,
        coin_balance: 5200,
        subscription_tier: "gold",
        personal_manager_id: pmId || null,
      }, { onConflict: "id" });
      results.push("Upserted pro_athlete");
    }

    // ===================== 3. POOLS =====================
    const pools = [
      { name: "Marina Private Pool", address: "Dubai Marina, Tower 5", city: "dubai", pool_type: "private", is_duel_eligible: true, lat: 25.0801, lng: 55.1405, lane_fee_per_hour: 150, contact_phone: "+971-4-555-0101" },
      { name: "Palm Jumeirah Club", address: "Palm Jumeirah, Frond E", city: "dubai", pool_type: "club", is_duel_eligible: true, lat: 25.1124, lng: 55.1390, lane_fee_per_hour: 200, contact_phone: "+971-4-555-0102" },
      { name: "Downtown Hotel Pool", address: "Downtown Dubai, Boulevard", city: "dubai", pool_type: "hotel", is_duel_eligible: false, lat: 25.1972, lng: 55.2744, lane_fee_per_hour: 180, contact_phone: "+971-4-555-0103" },
      { name: "Jumeirah Bay Pool", address: "Jumeirah Bay Island", city: "dubai", pool_type: "resort", is_duel_eligible: true, lat: 25.1850, lng: 55.2350, lane_fee_per_hour: 250, contact_phone: "+971-4-555-0104" },
      { name: "Sports City Aquatic", address: "Dubai Sports City", city: "dubai", pool_type: "olympic", is_duel_eligible: true, lat: 25.0292, lng: 55.2194, lane_fee_per_hour: 120, contact_phone: "+971-4-555-0105" },
      { name: "Caspian Club Pool", address: "Baku, Seaside Boulevard", city: "baku", pool_type: "club", is_duel_eligible: true, lat: 40.3615, lng: 49.8358, lane_fee_per_hour: 40, contact_phone: "+994-12-555-0201" },
      { name: "Baku Aquatic Center", address: "Baku Olympic Complex", city: "baku", pool_type: "olympic", is_duel_eligible: true, lat: 40.4093, lng: 49.8671, lane_fee_per_hour: 30, contact_phone: "+994-12-555-0202" },
      { name: "Narimanov Pool", address: "Narimanov District, Baku", city: "baku", pool_type: "public", is_duel_eligible: false, lat: 40.4200, lng: 49.8750, lane_fee_per_hour: 20, contact_phone: "+994-12-555-0203" },
    ];
    
    for (const p of pools) {
      await supabase.from("pools").upsert(p, { onConflict: "id", ignoreDuplicates: false });
    }
    results.push("Upserted 8 pools");

    // ===================== 4. ECONOMY SETTINGS =====================
    const settings = [
      { setting_key: "coins_per_lesson", setting_value: 50, description: "Coins awarded per completed lesson" },
      { setting_key: "streak_5_multiplier", setting_value: 1.5, description: "Coin multiplier for 5-lesson streak" },
      { setting_key: "streak_10_multiplier", setting_value: 2, description: "Coin multiplier for 10-lesson streak" },
      { setting_key: "referral_signup_coins", setting_value: 300, description: "Coins for referring a new signup" },
      { setting_key: "referral_payment_coins", setting_value: 500, description: "Coins when referral makes first payment" },
      { setting_key: "duel_rake_percent", setting_value: 15, description: "Academy % rake from duel stakes" },
      { setting_key: "coin_to_aed_discount_rate", setting_value: 0.04, description: "1 coin = X AED discount" },
      { setting_key: "coin_pack_starter_aed", setting_value: 25, description: "Starter coin pack price AED" },
      { setting_key: "coin_pack_starter_coins", setting_value: 300, description: "Starter coin pack coin amount" },
      { setting_key: "coin_pack_value_aed", setting_value: 50, description: "Value coin pack price AED" },
      { setting_key: "coin_pack_value_coins", setting_value: 700, description: "Value coin pack coin amount" },
      { setting_key: "coin_pack_pro_aed", setting_value: 100, description: "Pro coin pack price AED" },
      { setting_key: "coin_pack_pro_coins", setting_value: 1600, description: "Pro coin pack coin amount" },
      { setting_key: "coin_pack_elite_aed", setting_value: 200, description: "Elite coin pack price AED" },
      { setting_key: "coin_pack_elite_coins", setting_value: 3500, description: "Elite coin pack coin amount" },
      { setting_key: "max_discount_stack_percent", setting_value: 35, description: "Max stacked discount percentage" },
      { setting_key: "coin_discount_max_percent", setting_value: 15, description: "Max coin-based discount percent" },
      { setting_key: "coin_expiry_days", setting_value: 365, description: "Coins expire after X days" },
      { setting_key: "payment_penalty_day1", setting_value: 50, description: "Late payment penalty day 1 (coins)" },
      { setting_key: "payment_penalty_day3", setting_value: 100, description: "Late payment penalty day 3 (coins)" },
      { setting_key: "payment_penalty_day7", setting_value: 200, description: "Late payment penalty day 7 (coins)" },
      { setting_key: "payment_penalty_day14", setting_value: 500, description: "Late payment penalty day 14 (coins)" },
    ];
    
    for (const s of settings) {
      const { error } = await supabase.from("economy_settings").upsert(s, { onConflict: "setting_key", ignoreDuplicates: false });
      if (error) results.push(`economy_settings error for ${s.setting_key}: ${error.message}`);
    }
    results.push("Upserted 22 economy settings");

    // ===================== 5. ACHIEVEMENTS =====================
    const achievements = [
      { key: "first_lesson", name: "First Splash", description: "Complete your first swimming lesson", category: "milestone", coin_reward: 200, target_role: "student", icon_url: "🌊" },
      { key: "streak_5", name: "Wave Rider", description: "Achieve a 5-lesson streak", category: "streak", coin_reward: 300, target_role: "student", icon_url: "🌊🌊" },
      { key: "streak_10", name: "Ocean Master", description: "Achieve a 10-lesson streak", category: "streak", coin_reward: 700, target_role: "student", icon_url: "🌊🌊🌊" },
      { key: "first_duel_win", name: "Duel Victor", description: "Win your first duel", category: "duel", coin_reward: 500, target_role: "student", icon_url: "⚔️" },
      { key: "duel_streak_5", name: "Duel King", description: "Win 5 duels in a row", category: "duel", coin_reward: 1500, target_role: "student", icon_url: "👑" },
      { key: "white_belt", name: "Aqua Starter", description: "Earn your white swim belt", category: "belt", coin_reward: 300, target_role: "student", icon_url: "🤍" },
      { key: "black_belt", name: "ProFit Legend", description: "Earn the legendary black belt", category: "belt", coin_reward: 7500, target_role: "student", icon_url: "🖤" },
      { key: "baby_whisperer", name: "Baby Whisperer", description: "Successfully teach 50 kids under 5", category: "coach", coin_reward: 1000, target_role: "coach", icon_url: "🍼" },
      { key: "cpr_certified", name: "CPR Certified", description: "Complete CPR certification", category: "safety", coin_reward: 800, target_role: "coach", icon_url: "❤️" },
      { key: "profit_vision", name: "ProFit Vision", description: "Unlock the Ray-Ban Meta smart glasses", category: "tech", coin_reward: 2000, target_role: "coach", icon_url: "🕶️" },
      { key: "profit_mentor", name: "ProFit Mentor", description: "Mentor 5 trainee coaches", category: "mentor", coin_reward: 3000, target_role: "coach", icon_url: "🎓" },
      { key: "century_coach", name: "Century Coach", description: "Complete 100 lessons", category: "milestone", coin_reward: 1500, target_role: "coach", icon_url: "💯" },
    ];
    
    for (const a of achievements) {
      await supabase.from("achievements").upsert(a, { onConflict: "key", ignoreDuplicates: false });
    }
    results.push("Upserted 12 achievements");

    // ===================== 6. STORE ITEMS =====================
    const storeItems = [
      // Student store
      { name: "ProFit Cap", description: "Official ProFit Swimming cap", price_coins: 600, price_aed: 20, category: "merchandise", store_type: "student", sort_order: 1 },
      { name: "ProFit Goggles", description: "Anti-fog competition goggles", price_coins: 900, price_aed: 35, category: "merchandise", store_type: "student", sort_order: 2 },
      { name: "ProFit Towel", description: "Quick-dry microfiber towel", price_coins: 500, price_aed: 15, category: "merchandise", store_type: "student", sort_order: 3 },
      { name: "Avatar Frame: Gold", description: "Golden avatar frame for your profile", price_coins: 500, category: "cosmetic", store_type: "student", sort_order: 4 },
      { name: "Avatar Frame: Diamond", description: "Diamond avatar frame", price_coins: 2500, category: "cosmetic", store_type: "student", sort_order: 5, requires_rank: "orange" },
      // Parent store
      { name: "Subscription Freeze", description: "Pause subscription for up to 2 weeks", price_coins: 200, category: "service", store_type: "parent", sort_order: 1 },
      { name: "Lesson Reschedule", description: "Reschedule a confirmed lesson for free", price_coins: 100, category: "service", store_type: "parent", sort_order: 2 },
      { name: "10% Discount Coupon", description: "10% off next subscription renewal", price_coins: 800, category: "discount", store_type: "parent", sort_order: 3 },
      { name: "Premium Lesson Report", description: "Detailed AI-generated progress report", price_coins: 300, price_aed: 10, category: "service", store_type: "parent", sort_order: 4 },
      { name: "Priority Booking", description: "Get first pick on coach time slots", price_coins: 500, category: "service", store_type: "parent", sort_order: 5 },
      // Coach store
      { name: "Rank Frame: Silver", description: "Silver rank frame for your coach profile", price_coins: 500, category: "cosmetic", store_type: "coach", sort_order: 1 },
      { name: "Rank Frame: Gold", description: "Gold rank frame", price_coins: 1200, category: "cosmetic", store_type: "coach", sort_order: 2, requires_rank: "senior" },
      { name: "Rank Frame: Platinum", description: "Platinum rank frame", price_coins: 2500, category: "cosmetic", store_type: "coach", sort_order: 3, requires_rank: "elite" },
      { name: "Ray-Ban Meta Glasses", description: "Smart glasses for lesson recording", price_coins: 15000, price_aed: 800, category: "tech", store_type: "coach", sort_order: 4, requires_rank: "elite", is_limited: true, stock_count: 5 },
      { name: "Extra Day Off", description: "Earn an extra paid day off", price_coins: 3000, category: "service", store_type: "coach", sort_order: 5 },
      // Pro store
      { name: "Duel Highlight Reel", description: "AI-edited highlight video of your best duels", price_coins: 400, category: "content", store_type: "pro", sort_order: 1 },
      { name: "Pro Training Session", description: "1-on-1 with an Elite coach", price_coins: 2000, price_aed: 100, category: "service", store_type: "pro", sort_order: 2 },
      { name: "ProFit Rashguard", description: "Competition-grade rashguard", price_coins: 1500, price_aed: 60, category: "merchandise", store_type: "pro", sort_order: 3 },
      { name: "Duel Stake Booster", description: "Double your duel stake for free", price_coins: 800, category: "game", store_type: "pro", sort_order: 4, is_limited: true, max_per_user_per_period: 2, period_type: "weekly" },
      { name: "Leaderboard Badge", description: "Special badge on the pro leaderboard", price_coins: 1800, category: "cosmetic", store_type: "pro", sort_order: 5 },
    ];

    for (const item of storeItems) {
      await supabase.from("store_items").upsert(item, { onConflict: "id", ignoreDuplicates: false });
    }
    results.push("Upserted 20 store items");

    // ===================== 7. FINANCIAL TRANSACTIONS =====================
    // Get first pool for booking references
    const { data: poolsData } = await supabase.from("pools").select("id").limit(2);
    const pool1Id = poolsData?.[0]?.id;
    const pool2Id = poolsData?.[1]?.id;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const transactions = [
      { amount: 1200, direction: "income", type: "subscription", currency: "AED", city: "dubai", payer_id: parent1Id, description: "Pack 8 subscription payment", status: "completed", created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
      { amount: 600, direction: "income", type: "subscription", currency: "AED", city: "baku", payer_id: parent2Id, description: "Pack 4 subscription payment", status: "completed", created_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
      { amount: 199, direction: "income", type: "coin_purchase", currency: "AED", city: "dubai", payer_id: parent1Id, description: "Coin pack purchase - Value", status: "completed", created_at: new Date(now.getTime() - 1 * 86400000).toISOString() },
      { amount: 300, direction: "income", type: "lesson_fee", currency: "AED", city: "dubai", payer_id: parent1Id, payee_id: coach1Id, description: "Private lesson with Coach Marco", status: "completed", created_at: now.toISOString() },
      { amount: 800, direction: "income", type: "subscription", currency: "AED", city: "dubai", payer_id: parent1Id, description: "Premium subscription upgrade", status: "completed", created_at: new Date(now.getTime() - 10 * 86400000).toISOString() },
      { amount: 299, direction: "income", type: "coin_purchase", currency: "AED", city: "dubai", payer_id: parent1Id, description: "Coin pack purchase - Pro", status: "completed", created_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
      { amount: 450, direction: "expense", type: "coach_salary", currency: "AED", city: "dubai", payee_id: coach1Id, description: "Coach Marco - weekly salary", status: "completed", created_at: new Date(now.getTime() - 7 * 86400000).toISOString() },
      { amount: 600, direction: "expense", type: "coach_salary", currency: "AED", city: "baku", payee_id: coach2Id, description: "Coach Elena - weekly salary", status: "completed", created_at: new Date(now.getTime() - 7 * 86400000).toISOString() },
    ];

    for (const t of transactions) {
      await supabase.from("financial_transactions").insert(t);
    }
    results.push("Inserted 8 financial transactions");

    // ===================== 8. BOOKINGS =====================
    const bookings = [
      { student_id: student1Id, coach_id: coach1Id, parent_id: parent1Id, pool_id: pool1Id, status: "completed", booking_type: "private", lesson_fee: 150, currency: "AED", created_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
      { student_id: student1Id, coach_id: coach1Id, parent_id: parent1Id, pool_id: pool1Id, status: "confirmed", booking_type: "private", lesson_fee: 150, currency: "AED", created_at: new Date(now.getTime() - 1 * 86400000).toISOString() },
      { student_id: student2Id, coach_id: coach2Id, parent_id: parent2Id, pool_id: pool2Id, status: "confirmed", booking_type: "private", lesson_fee: 200, currency: "AED", created_at: now.toISOString() },
      { student_id: student1Id, coach_id: coach1Id, parent_id: parent1Id, pool_id: pool1Id, status: "in_progress", booking_type: "premium", lesson_fee: 300, is_premium_recorded: true, currency: "AED", created_at: now.toISOString() },
    ];

    for (const b of bookings) {
      await supabase.from("bookings").insert(b);
    }
    results.push("Inserted 4 bookings");

    // ===================== 9. SUBSCRIPTIONS =====================
    const subStartDate = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);
    const subEndDate = new Date(now.getTime() + 75 * 86400000).toISOString().slice(0, 10);

    const subscriptions = [
      { parent_id: parent1Id, student_id: student1Id, coach_id: coach1Id, package_type: "pack_8", total_lessons: 8, used_lessons: 3, price: 1200, original_price: 1200, currency: "AED", city: "dubai", status: "active", starts_at: subStartDate, expires_at: subEndDate, transport_included: true },
      { parent_id: parent2Id, student_id: student2Id, coach_id: coach2Id, package_type: "pack_4", total_lessons: 4, used_lessons: 1, price: 600, original_price: 600, currency: "AED", city: "baku", status: "active", starts_at: subStartDate, expires_at: subEndDate, transport_included: false },
    ];

    for (const s of subscriptions) {
      await supabase.from("subscriptions").insert(s);
    }
    results.push("Inserted 2 subscriptions");

    // ===================== 10. DUEL =====================
    if (student1Id && student2Id && pool1Id) {
      await supabase.from("duels").insert({
        challenger_id: student1Id,
        opponent_id: student2Id,
        pool_id: pool1Id,
        duel_type: "friendly",
        swim_style: "freestyle",
        distance_meters: 25,
        stake_coins: 200,
        status: "pending",
        win_condition: "fastest_time",
      });
      results.push("Inserted 1 duel");
    }

    // ===================== 11. MANAGER ASSIGNMENT =====================
    if (pmId && parent1Id) {
      await supabase.from("manager_assignments").insert({
        manager_id: pmId,
        client_id: parent1Id,
        assigned_by: adminId,
        is_active: true,
        notes: "VIP client - premium package",
      });
      results.push("Inserted manager assignment");
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error), results }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
