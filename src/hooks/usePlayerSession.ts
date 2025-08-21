import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SessionState {
  isConnected: boolean;
  playerCount: number;
  queueCount: number;
  canJoin: boolean;
  queuePosition: number;
  isKicked: boolean;
  kickReason: 'timeout' | 'inactivity' | 'full' | 'disconnected' | null;
  playerId: string | null;
  sessionToken: string | null;
}

const MAX_PLAYERS = 100;

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
    sessionToken: null,
  });

  const activityIntervalRef = useRef<NodeJS.Timeout>();

  // Generate consistent player ID
  const [playerId] = useState(() => {
    let storedId = localStorage.getItem('playerId');
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('playerId', storedId);
    }
    return storedId;
  });

  // Simple join session using database function
  const joinSession = useCallback(async () => {
    try {
      console.log('Attempting to join session using database function...');
      
      const sessionToken = crypto.randomUUID();
      const anonymousId = `Player_${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
      const position_x = Math.floor(Math.random() * (10000 - 512));
      const position_y = Math.floor(Math.random() * (10000 - 512));

      // Use our new database function
      const { data: success, error } = await supabase.rpc('join_player_session', {
        p_player_id: playerId,
        p_session_token: sessionToken,
        p_anonymous_id: anonymousId,
        p_position_x: position_x,
        p_position_y: position_y
      });

      if (error) {
        console.error('Join session failed:', error);
        return false;
      }

      if (!success) {
        console.log('Room is full');
        setSessionState(prev => ({
          ...prev,
          canJoin: false,
          kickReason: 'full'
        }));
        return false;
      }

      console.log('Successfully joined session');
      setSessionState(prev => ({
        ...prev,
        isConnected: true,
        canJoin: true,
        playerId,
        sessionToken,
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
      console.log('Leaving session');
      
      // Clear intervals first
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
        activityIntervalRef.current = undefined;
      }
      
      // Simple cleanup using secure functions
      await supabase.from('player_sessions').delete().eq('player_id', playerId);
      await supabase.rpc('leave_player_queue', { p_player_id: playerId });
      
      setSessionState(prev => ({
        ...prev,
        isConnected: false,
        canJoin: false,
        playerId: null,
        sessionToken: null,
        isKicked: false,
        kickReason: null,
      }));
      
    } catch (error) {
      console.error('Leave session error:', error);
    }
  }, [playerId]);

  // Smart activity tracking with Page Visibility API
  const updateActivity = useCallback(async () => {
    if (!sessionState.isConnected || !sessionState.sessionToken) return;
    
    // Only update activity if page is visible
    if (document.hidden) return;

    try {
      await supabase.rpc('update_player_activity', {
        p_session_token: sessionState.sessionToken
      });
    } catch (error) {
      console.log('Activity update failed');
      // Don't disconnect immediately - let server-side cleanup handle it
    }
  }, [sessionState.isConnected, sessionState.sessionToken]);

  // Update position
  const updatePosition = useCallback(async (x: number, y: number) => {
    if (!sessionState.isConnected || !sessionState.sessionToken) return;

    try {
      await supabase
        .from('player_sessions')
        .update({ 
          position_x: Math.floor(x),
          position_y: Math.floor(y),
          last_activity: new Date().toISOString()
        })
        .eq('session_token', sessionState.sessionToken);
    } catch (error) {
      console.log('Position update failed');
    }
  }, [sessionState.isConnected, sessionState.sessionToken]);

  // Update paint state
  const updatePaintState = useCallback(async (color?: string, tool?: string, size?: number) => {
    if (!sessionState.isConnected || !sessionState.sessionToken) return;

    try {
      const updates: any = { last_activity: new Date().toISOString() };
      if (color !== undefined) updates.current_color = color;
      if (tool !== undefined) updates.current_tool = tool;
      if (size !== undefined) updates.current_size = size;

      await supabase
        .from('player_sessions')
        .update(updates)
        .eq('session_token', sessionState.sessionToken);
    } catch (error) {
      console.log('Paint state update failed');
    }
  }, [sessionState.isConnected, sessionState.sessionToken]);

  // Set up effects with Page Visibility API
  useEffect(() => {
    let subscription: any = null;
    let visibilityHandler: () => void;
    
    // Refresh player count
    const refreshPlayerCount = async () => {
      try {
        const { data: activeCount } = await supabase.rpc('get_active_player_count');
        const { data: queueCount } = await supabase.rpc('get_queue_count');

        setSessionState(prev => ({
          ...prev,
          playerCount: activeCount || 0,
          queueCount: queueCount || 0,
          canJoin: (activeCount || 0) < MAX_PLAYERS,
        }));
      } catch (error) {
        console.error('Error refreshing counts:', error);
      }
    };

    // Subscribe to changes
    subscription = supabase
      .channel('multiplayer-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_sessions' }, () => {
        refreshPlayerCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_queue' }, () => {
        refreshPlayerCount();
      })
      .subscribe();

    // Initial count refresh
    refreshPlayerCount();

    // Set up activity heartbeat and visibility handling if connected
    if (sessionState.isConnected) {
      // More frequent heartbeat every 15 seconds (only when page is visible)
      activityIntervalRef.current = setInterval(() => {
        if (!document.hidden) {
          updateActivity();
        }
      }, 15000);
      
      // Handle page visibility changes
      visibilityHandler = () => {
        if (document.hidden) {
          // Page became hidden - stop activity updates and set timer to leave if hidden too long
          console.log('Page hidden - pausing activity updates');
          // If page is hidden for more than 45 seconds, leave session to prevent phantom users
          setTimeout(() => {
            if (document.hidden && sessionState.isConnected) {
              console.log('Page hidden too long - leaving session');
              leaveSession();
            }
          }, 45000);
        } else {
          // Page became visible - send immediate activity update
          console.log('Page visible - resuming activity updates');
          updateActivity();
        }
      };
      
      document.addEventListener('visibilitychange', visibilityHandler);
      
      // Send immediate activity update when setting up
      updateActivity();
    }

    return () => {
      if (subscription) subscription.unsubscribe();
      if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
  }, [sessionState.isConnected, updateActivity]);

  // Cleanup on unmount with enhanced visibility handling
  useEffect(() => {
    const cleanup = async () => {
      if (sessionState.isConnected) {
        // Use both direct cleanup and secure function
        await Promise.all([
          supabase.from('player_sessions').delete().eq('player_id', playerId),
          supabase.rpc('leave_player_queue', { p_player_id: playerId })
        ]);
      }
    };

    // Handle page unload/close
    const handleBeforeUnload = () => {
      cleanup();
    };
    
    // Handle page visibility change for better cleanup
    const handleVisibilityChange = () => {
      if (document.hidden && sessionState.isConnected) {
        // User switched tabs or minimized - they're still active but not visible
        // Activity updates will pause but connection remains
        console.log('Page hidden but maintaining connection');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanup();
    };
  }, [sessionState.isConnected, playerId]);

  return {
    sessionState,
    joinSession,
    leaveSession,
    updateActivity,
    updatePosition,
    updatePaintState,
    resetKick: () => {
      setSessionState(prev => ({ 
        ...prev, 
        isKicked: false, 
        kickReason: null,
        canJoin: true,
      }));
    },
  };
};