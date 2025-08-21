import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Highscore {
  id: string;
  emoji_id: string;
  stroke_count: number;
  created_at: string;
  player_id: string;
}

export const useHighscores = () => {
  const [highscores, setHighscores] = useState<Highscore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHighscores = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('highscores')
        .select('*')
        .order('stroke_count', { ascending: false })
        .limit(33);

      if (error) throw error;
      
      setHighscores(data || []);
    } catch (error) {
      console.error('Error fetching highscores:', error);
      setHighscores([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitHighscore = useCallback(async (emojiId: string, strokeCount: number, playerId: string, sessionToken?: string) => {
    try {
      const { error } = await supabase
        .from('highscores')
        .insert({
          emoji_id: emojiId,
          stroke_count: strokeCount,
          player_id: playerId,
          session_token: sessionToken
        });

      if (error) throw error;
      
      // Refresh highscores after submission
      await fetchHighscores();
      return true;
    } catch (error) {
      console.error('Error submitting highscore:', error);
      return false;
    }
  }, [fetchHighscores]);

  useEffect(() => {
    fetchHighscores();
  }, [fetchHighscores]);

  return {
    highscores,
    isLoading,
    fetchHighscores,
    submitHighscore
  };
};