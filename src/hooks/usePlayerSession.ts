import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseReady } from '@/lib/supabase-client';

export interface PlayerSession {
  id: string;
  player_id: string;
  session_start: string;
  last_activity: string;
  is_active: boolean;
  position_x: number;
  position_y: number;
}

export interface SessionState {
  isConnected: boolean;
  playerCount: number;
  canJoin: boolean;
  queuePosition: number;
  isKicked: boolean;
  kickReason: 'timeout' | 'inactivity' | 'full' | null;
  playerId: string | null;
}

const MAX_PLAYERS = 100;
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const INACTIVITY_TIMEOUT = 60 * 1000; // 1 minute

export const usePlayerSession = () => {
  const [sessionState, setSessionState] = useState<SessionState>({
    isConnected: false,
    playerCount: 0,
    canJoin: false,
    queuePosition: 0,
    isKicked: false,
    kickReason: null,
    playerId: null,
  });

  const [playerId] = useState(() => 
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  );

  // Join session
  const joinSession = useCallback(async () => {
    // If Supabase is not available, use mock mode
    if (!isSupabaseReady || !supabase) {
      console.log('Using mock session - Supabase not configured');
      setSessionState(prev => ({
        ...prev,
        isConnected: true,
        canJoin: true,
        playerId,
        isKicked: false,
        kickReason: null,
        playerCount: Math.floor(Math.random() * 50) + 1, // Mock player count
      }));
      return true;
    }

    try {
      // Check current player count
      const { data: sessions, error: countError } = await supabase
        .from('player_sessions')
        .select('*')
        .eq('is_active', true);

      if (countError) {
        console.error('Error checking player count:', countError);
        return false;
      }

      if (sessions && sessions.length >= MAX_PLAYERS) {
        setSessionState(prev => ({
          ...prev,
          canJoin: false,
          queuePosition: 1,
          kickReason: 'full'
        }));
        return false;
      }

      // Join the session
      const { error: insertError } = await supabase
        .from('player_sessions')
        .insert({
          player_id: playerId,
          is_active: true,
          position_x: Math.floor(Math.random() * 10000),
          position_y: Math.floor(Math.random() * 10000),
        });

      if (insertError) {
        console.error('Error joining session:', insertError);
        return false;
      }

      setSessionState(prev => ({
        ...prev,
        isConnected: true,
        canJoin: true,
        playerId,
        isKicked: false,
        kickReason: null,
      }));

      return true;
    } catch (error) {
      console.error('Join session error:', error);
      return false;
    }
  }, [playerId]);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (!isSupabaseReady || !supabase) {
      setSessionState(prev => ({
        ...prev,
        isConnected: false,
        canJoin: false,
        playerId: null,
      }));
      return;
    }

    try {
      await supabase
        .from('player_sessions')
        .delete()
        .eq('player_id', playerId);

      setSessionState(prev => ({
        ...prev,
        isConnected: false,
        canJoin: false,
        playerId: null,
      }));
    } catch (error) {
      console.error('Leave session error:', error);
    }
  }, [playerId]);

  // Update activity
  const updateActivity = useCallback(async () => {
    if (!sessionState.isConnected || !isSupabaseReady || !supabase) return;

    try {
      await supabase
        .from('player_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('player_id', playerId);
    } catch (error) {
      console.error('Activity update error:', error);
    }
  }, [playerId, sessionState.isConnected]);

  // Update position
  const updatePosition = useCallback(async (x: number, y: number) => {
    if (!sessionState.isConnected || !isSupabaseReady || !supabase) return;

    try {
      await supabase
        .from('player_sessions')
        .update({ 
          position_x: Math.floor(x),
          position_y: Math.floor(y),
          last_activity: new Date().toISOString()
        })
        .eq('player_id', playerId);
    } catch (error) {
      console.error('Position update error:', error);
    }
  }, [playerId, sessionState.isConnected]);

  // Set up real-time subscriptions and cleanup
  useEffect(() => {
    let activityInterval: NodeJS.Timeout;
    let cleanupInterval: NodeJS.Timeout;
    let subscription: any = null;

    // Subscribe to player sessions changes (only if Supabase is available)
    if (isSupabaseReady && supabase) {
      subscription = supabase
        .channel('player_sessions')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'player_sessions' },
          (payload) => {
            // Refresh player count
            refreshPlayerCount();
          }
        )
        .subscribe();
    }

    // Refresh player count
    const refreshPlayerCount = async () => {
      if (!isSupabaseReady || !supabase) {
        // Mock player count updates
        setSessionState(prev => ({
          ...prev,
          playerCount: Math.floor(Math.random() * 50) + 1,
          canJoin: true,
          queuePosition: 0,
        }));
        return;
      }

      try {
        const { data: sessions, error } = await supabase
          .from('player_sessions')
          .select('*')
          .eq('is_active', true);

        if (!error && sessions) {
          const count = sessions.length;
          setSessionState(prev => ({
            ...prev,
            playerCount: count,
            canJoin: count < MAX_PLAYERS,
            queuePosition: Math.max(0, count - MAX_PLAYERS + 1),
          }));
        }
      } catch (error) {
        console.error('Error refreshing player count:', error);
      }
    };

    // Initial player count
    refreshPlayerCount();

    // Set up activity heartbeat
    if (sessionState.isConnected) {
      activityInterval = setInterval(updateActivity, 30000); // Every 30 seconds
    }

    // Set up cleanup interval
    cleanupInterval = setInterval(async () => {
      if (!isSupabaseReady || !supabase) return; // Skip cleanup if Supabase not available
      
      try {
        // Clean up old sessions
        const tenMinutesAgo = new Date(Date.now() - SESSION_TIMEOUT).toISOString();
        const oneMinuteAgo = new Date(Date.now() - INACTIVITY_TIMEOUT).toISOString();

        await supabase
          .from('player_sessions')
          .delete()
          .or(`session_start.lt.${tenMinutesAgo},last_activity.lt.${oneMinuteAgo}`);

        // Check if current player was kicked
        if (sessionState.isConnected) {
          const { data: currentSession } = await supabase
            .from('player_sessions')
            .select('*')
            .eq('player_id', playerId)
            .single();

          if (!currentSession) {
            // Player was kicked
            setSessionState(prev => ({
              ...prev,
              isConnected: false,
              isKicked: true,
              kickReason: 'timeout',
              canJoin: false,
            }));
          }
        }

        refreshPlayerCount();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, 10000); // Every 10 seconds

    return () => {
      if (subscription) subscription.unsubscribe();
      if (activityInterval) clearInterval(activityInterval);
      if (cleanupInterval) clearInterval(cleanupInterval);
    };
  }, [sessionState.isConnected, updateActivity, playerId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionState.isConnected) {
        leaveSession();
      }
    };
  }, []);

  return {
    sessionState,
    joinSession,
    leaveSession,
    updateActivity,
    updatePosition,
    resetKick: () => setSessionState(prev => ({ ...prev, isKicked: false, kickReason: null })),
  };
};