import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlayerSession {
  id: string;
  player_id: string;
  session_start: string;
  last_activity: string;
  is_active: boolean;
  position_x: number;
  position_y: number;
  current_color?: string;
  current_tool?: string;
  current_size?: number;
}

export interface SessionState {
  isConnected: boolean;
  playerCount: number;
  queueCount: number;
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
    queueCount: 0,
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
          current_color: '#000000',
          current_tool: 'brush',
          current_size: 5,
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
    if (!sessionState.isConnected) return;

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
    if (!sessionState.isConnected) return;

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

  // Update paint state (color, tool, size)
  const updatePaintState = useCallback(async (color?: string, tool?: string, size?: number) => {
    if (!sessionState.isConnected) return;

    try {
      const updates: any = { last_activity: new Date().toISOString() };
      if (color !== undefined) updates.current_color = color;
      if (tool !== undefined) updates.current_tool = tool;
      if (size !== undefined) updates.current_size = size;

      await supabase
        .from('player_sessions')
        .update(updates)
        .eq('player_id', playerId);
    } catch (error) {
      console.error('Paint state update error:', error);
    }
  }, [playerId, sessionState.isConnected]);

  // Set up real-time subscriptions and cleanup
  useEffect(() => {
    let activityInterval: NodeJS.Timeout;
    let cleanupInterval: NodeJS.Timeout;
    let subscription: any = null;

    // Subscribe to player sessions changes
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

    // Refresh player count
    const refreshPlayerCount = async () => {
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
      try {
        // Use the cleanup function from the database
        await supabase.rpc('cleanup_inactive_sessions');

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
    }, 30000); // Every 30 seconds

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
    updatePaintState,
    resetKick: () => setSessionState(prev => ({ ...prev, isKicked: false, kickReason: null })),
  };
};