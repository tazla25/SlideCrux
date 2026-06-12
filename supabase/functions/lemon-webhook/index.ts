import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
// Use node crypto polyfill in Deno if needed, but since it's an edge function:
import { createHmac } from "node:crypto"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-signature')
    if (!signature) {
      return new Response('Missing signature', { status: 400 })
    }

    const secret = Deno.env.get('LEMON_SQUEEZY_WEBHOOK_SECRET')
    if (!secret) {
      console.warn('Webhook secret not configured')
      return new Response('Server error', { status: 500 })
    }

    const bodyText = await req.text()
    
    // Verify signature
    const hmacVal = createHmac('sha256', secret).update(bodyText).digest('hex')
    if (signature !== hmacVal) {
      return new Response('Invalid signature', { status: 401 })
    }

    const payload = JSON.parse(bodyText)
    const eventName = payload.meta.event_name
    const data = payload.data

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // The user ID should be passed in custom data
    const userId = payload.meta.custom_data?.user_id
    if (!userId) {
      console.warn('No user_id found in custom_data')
      return new Response('Missing user_id', { status: 400 })
    }

    const lemonSqueezyId = data.id
    const attributes = data.attributes
    const status = attributes.status
    const variantId = attributes.variant_id
    const endsAt = attributes.renews_at || attributes.ends_at

    let plan = 'free'
    if (status === 'active' || status === 'on_trial') {
      // Logic to determine plan based on variant ID
      if (variantId.toString() === Deno.env.get('VITE_LEMON_PRO_VARIANT_ID')) {
        plan = 'pro'
      } else if (variantId.toString() === Deno.env.get('VITE_LEMON_TEAM_VARIANT_ID')) {
        plan = 'team'
      } else {
        plan = 'pro' // Default fallback
      }
    }

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      // Upsert subscription
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          lemon_squeezy_id: lemonSqueezyId,
          status,
          variant_id: variantId.toString(),
          current_period_end: endsAt
        }, { onConflict: 'lemon_squeezy_id' })
        
      if (subError) throw subError

      // Update profile plan
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ plan, lemon_customer_id: data.attributes.customer_id?.toString() || null })
        .eq('id', userId)

      if (profileError) throw profileError
      
    } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      // Update subscription
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status,
          current_period_end: endsAt
        })
        .eq('lemon_squeezy_id', lemonSqueezyId)
        
      if (subError) throw subError

      // Update profile plan if expired
      if (status === 'expired') {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ plan: 'free' })
          .eq('id', userId)
          
        if (profileError) throw profileError
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
