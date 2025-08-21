import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSessionCleanup = () => {
  useEffect(() => {
    // Call cleanup function every 30 seconds (more frequent)
    const cleanupInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cleanup-sessions');
        
        if (error) {
          console.log('Session cleanup error:', error);
        } else {
          console.log('Session cleanup completed:', data);
        }
      } catch (error) {
        console.log('Failed to call cleanup function:', error);
      }
    }, 30000); // Every 30 seconds

    // Initial cleanup call
    const initialCleanup = async () => {
      try {
        await supabase.functions.invoke('cleanup-sessions');
      } catch (error) {
        console.log('Initial cleanup failed:', error);
      }
    };
    
    initialCleanup();

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);
};