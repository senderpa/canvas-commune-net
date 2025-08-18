// Simple Supabase client with fallback
export let supabase: any = null;
export let isSupabaseReady = false;

export const initializeSupabase = async () => {
  try {
    // Check if we have environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;
    
    console.log('Environment variables check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      allEnvVars: Object.keys(import.meta.env).filter(key => key.toLowerCase().includes('supabase'))
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not found. Running in mock mode.');
      isSupabaseReady = false;
      return null;
    }

    // Dynamic import to avoid breaking the app if Supabase isn't available
    const { createClient } = await import('@supabase/supabase-js');
    
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    isSupabaseReady = true;
    console.log('Supabase initialized successfully');
    return supabase;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    isSupabaseReady = false;
    return null;
  }
};

// Initialize on module load
initializeSupabase();