import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting session cleanup...')
    
    // Run the cleanup function
    const { data, error } = await supabaseClient.rpc('cleanup_inactive_sessions')
    
    if (error) {
      console.error('Cleanup failed:', error)
      return new Response(
        JSON.stringify({ error: 'Cleanup failed', details: error.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get updated counts after cleanup
    const { data: activeCount } = await supabaseClient.rpc('get_active_player_count')
    const { data: queueCount } = await supabaseClient.rpc('get_queue_count')
    
    console.log(`Cleanup completed. Active players: ${activeCount}, Queue: ${queueCount}`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        activeCount: activeCount || 0,
        queueCount: queueCount || 0,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})