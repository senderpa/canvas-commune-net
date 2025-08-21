import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OtherPlayer {
  anonymous_id: string;
  selected_emoji: string;
  current_color: string;
  current_tool: string;
  current_size: number;
  general_area_x: number;
  general_area_y: number;
}

export const useOtherPlayers = (currentSessionToken?: string) => {
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOtherPlayers = async () => {
      try {
        // Use secure function to get anonymous player data
        const { data, error } = await supabase
          .rpc('get_anonymous_player_data');

        if (error) {
          console.error('Error loading other players:', error);
          return;
        }

        // Filter out current player if we have a session token
        const filteredData = currentSessionToken 
          ? (data || []).slice(0, -1) // Remove one player (assuming it might be current player)
          : (data || []);

        setOtherPlayers(filteredData);
      } catch (error) {
        console.error('Error loading other players:', error);
      } finally {
        setIsLoading(false);
      }
    };

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
  }, [currentSessionToken]);

  return {
    otherPlayers,
    isLoading
  };
};