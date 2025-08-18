import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OtherPlayer {
  id: string;
  player_id: string;
  position_x: number;
  position_y: number;
  current_color: string;
  current_tool: string;
  current_size: number;
  is_active: boolean;
  last_activity: string;
}

export const useOtherPlayers = (currentPlayerId?: string) => {
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOtherPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('player_sessions')
          .select('*')
          .eq('is_active', true)
          .neq('player_id', currentPlayerId || '');

        if (error) {
          console.error('Error loading other players:', error);
          return;
        }

        setOtherPlayers(data || []);
      } catch (error) {
        console.error('Error loading other players:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentPlayerId) {
      loadOtherPlayers();

      // Set up real-time subscription to player sessions
      const channel = supabase
        .channel('other-players-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'player_sessions' },
          (payload) => {
            // Refresh other players data
            loadOtherPlayers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setIsLoading(false);
    }
  }, [currentPlayerId]);

  return {
    otherPlayers,
    isLoading
  };
};