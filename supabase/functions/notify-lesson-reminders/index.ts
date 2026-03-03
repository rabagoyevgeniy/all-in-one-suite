import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'booking_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id, parent_id, coach_id, status, lesson_fee, currency,
        pools(name, address)
      `)
      .eq('id', booking_id)
      .single();

    if (error || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get names
    const { data: parentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', booking.parent_id)
      .single();

    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', booking.coach_id)
      .single();

    const poolName = (booking.pools as any)?.name || 'TBD';
    const coachName = coachProfile?.full_name || 'Coach';
    const parentName = parentProfile?.full_name || 'Parent';

    // Send confirmation notifications
    const notifications = [];

    if (booking.parent_id) {
      notifications.push({
        user_id: booking.parent_id,
        title: '✅ Урок забронирован!',
        body: `Тренер: ${coachName} | Бассейн: ${poolName}`,
        type: 'system',
        reference_id: booking.id,
      });
    }

    if (booking.coach_id) {
      notifications.push({
        user_id: booking.coach_id,
        title: '📅 Новый урок!',
        body: `Забронировал: ${parentName}`,
        type: 'system',
        reference_id: booking.id,
      });
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    return new Response(JSON.stringify({ success: true, sent: notifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
