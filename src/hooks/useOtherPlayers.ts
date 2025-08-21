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
        // Use secure function to get public player data (no sensitive info exposed)
        const { data, error } = await supabase
          .rpc('get_public_player_data');

        if (error) {
          console.error('Error loading other players:', error);
          return;
        }

        // Convert to the expected format and filter out current player if needed
        const filteredData = (data || []).map(player => ({
          anonymous_id: player.anonymous_id,
          selected_emoji: player.selected_emoji,
          current_color: player.current_color,
          current_tool: player.current_tool,
          current_size: player.current_size,
          general_area_x: Math.round(player.position_x / 100) * 100,
          general_area_y: Math.round(player.position_y / 100) * 100
        }));

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