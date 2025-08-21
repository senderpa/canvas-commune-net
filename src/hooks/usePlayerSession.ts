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
  kickReason: 'timeout' | 'inactivity' | 'full' | 'disconnected' | null;
  playerId: string | null;
}

const MAX_PLAYERS = 100;
const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

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

  const [playerId] = useState(() => {
    // Try to get existing playerId from localStorage
    let storedId = localStorage.getItem('playerId');
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('playerId', storedId);
    }
    return storedId;
  });

  // Join session (only called when clicking "Start Painting")
  const joinSession = useCallback(async () => {
    try {
      // First, clean up any existing sessions for this playerId to prevent duplicates on reload
      await supabase
        .from('player_sessions')
        .delete()
        .eq('player_id', playerId);
      
      await supabase
        .from('player_queue')
        .delete()
        .eq('player_id', playerId);

      // Check current active player count
      const { data: sessions, error: countError } = await supabase
        .from('player_sessions')
        .select('*')
        .eq('is_active', true);

      if (countError) {
        console.error('Error checking player count:', countError);
        return false;
      }

      if (sessions && sessions.length >= MAX_PLAYERS) {
        // Room is full - add to queue
        const { data: queueData, error: queueCountError } = await supabase
          .from('player_queue')
          .select('*')
          .order('queue_position', { ascending: false })
          .limit(1);

        if (queueCountError) {
          console.error('Error checking queue:', queueCountError);
          return false;
        }

        const nextPosition = (queueData?.[0]?.queue_position || 0) + 1;

        const { error: queueError } = await supabase
          .from('player_queue')
          .insert({
            player_id: playerId,
            queue_position: nextPosition
          });

        if (queueError) {
          console.error('Error joining queue:', queueError);
          return false;
        }

        setSessionState(prev => ({
          ...prev,
          canJoin: false,
          queuePosition: nextPosition,
          kickReason: 'full'
        }));
        return false;
      }

      // Room has space - join directly
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
      // Remove from active sessions
      await supabase
        .from('player_sessions')
        .delete()
        .eq('player_id', playerId);

      // Remove from queue if present
      await supabase
        .from('player_queue')
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

    // Cleanup function to remove current player
    const cleanup = async () => {
      try {
        await supabase
          .from('player_sessions')
          .delete()
          .eq('player_id', playerId);
        
        await supabase
          .from('player_queue')
          .delete()
          .eq('player_id', playerId);
        
        console.log('Cleaned up player session:', playerId);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };

    // Add cleanup listeners for page unload
    const handleBeforeUnload = () => {
      console.log('Page unloading - cleaning up session immediately');
      if (sessionState.isConnected && playerId) {
        // Use sendBeacon for reliable cleanup on page unload
        const data = JSON.stringify({ player_id: playerId });
        navigator.sendBeacon('/api/cleanup-player', data);
        
        // Also try direct cleanup
        cleanup();
        
        // Set kicked state for restart prompt
        setSessionState(prev => ({
          ...prev,
          isConnected: false,
          isKicked: true,
          kickReason: 'disconnected',
          canJoin: true,
          playerCount: Math.max(0, prev.playerCount - 1)
        }));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && sessionState.isConnected) {
        console.log('Page hidden - cleaning up session');
        cleanup();
        
        // Set kicked state for restart prompt  
        setSessionState(prev => ({
          ...prev,
          isConnected: false,
          isKicked: true,
          kickReason: 'disconnected',
          canJoin: true,
          playerCount: Math.max(0, prev.playerCount - 1)
        }));
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh player count and queue
    const refreshPlayerCount = async () => {
      try {
        // Get active players count
        const { data: sessions, error: sessionsError } = await supabase
          .from('player_sessions')
          .select('*')
          .eq('is_active', true);

        // Get queue count  
        const { data: queue, error: queueError } = await supabase
          .from('player_queue')
          .select('*')
          .order('queue_position', { ascending: true });

        if (!sessionsError && !queueError) {
          const activeCount = sessions?.length || 0;
          const queueCount = queue?.length || 0;
          
          console.log('Current active players:', activeCount, 'Queue:', queueCount);
          
          setSessionState(prev => ({
            ...prev,
            playerCount: activeCount,
            queueCount: queueCount,
            canJoin: activeCount < MAX_PLAYERS,
            queuePosition: queue?.findIndex(q => q.player_id === playerId) + 1 || 0,
          }));
        }
      } catch (error) {
        console.error('Error refreshing counts:', error);
      }
    };

    // Subscribe to player sessions and queue changes
    subscription = supabase
      .channel('multiplayer-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_sessions' },
        (payload) => {
          console.log('Player session change:', payload);
          refreshPlayerCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_queue' },
        (payload) => {
          console.log('Queue change:', payload);
          refreshPlayerCount();
        }
      )
      .subscribe();

    // Initial player count
    refreshPlayerCount();

    // Set up activity heartbeat
    if (sessionState.isConnected) {
      activityInterval = setInterval(updateActivity, 30000); // Every 30 seconds
    }

    // Set up cleanup interval - more aggressive cleanup
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
    }, 15000); // Every 15 seconds for more responsive cleanup

    return () => {
      // Cleanup subscriptions
      if (subscription) subscription.unsubscribe();
      if (activityInterval) clearInterval(activityInterval);
      if (cleanupInterval) clearInterval(cleanupInterval);
      
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Final cleanup
      if (sessionState.isConnected) {
        cleanup();
      }
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