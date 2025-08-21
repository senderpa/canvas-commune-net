
import { useState, useEffect, useCallback, useRef } from 'react';
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
  session_token?: string;
  anonymous_id?: string;
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
  const cleanupIntervalRef = useRef<NodeJS.Timeout>();

  const [playerId] = useState(() => {
    let storedId = localStorage.getItem('playerId');
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('playerId', storedId);
    }
    return storedId;
  });

  // More thorough cleanup function
  const cleanupPlayerSessions = useCallback(async (playerIdToClean: string) => {
    console.log('Cleaning up sessions for player:', playerIdToClean);
    
    try {
      // Multiple cleanup attempts to ensure thorough removal
      const cleanupPromises = [
        supabase.from('player_sessions').delete().eq('player_id', playerIdToClean),
        supabase.from('player_queue').delete().eq('player_id', playerIdToClean)
      ];
      
      await Promise.allSettled(cleanupPromises);
      
      // Wait a bit and try again to ensure complete cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await Promise.allSettled([
        supabase.from('player_sessions').delete().eq('player_id', playerIdToClean),
        supabase.from('player_queue').delete().eq('player_id', playerIdToClean)
      ]);
        
      console.log('Cleanup completed');
    } catch (error) {
      console.log('Cleanup error (may be normal):', error);
    }
  }, []);

  // Simplified join session with proper RLS context
  const joinSession = useCallback(async () => {
    try {
      console.log('Attempting to join session...');
      
      // Set RLS context for this player using the new function
      await supabase.rpc('set_player_context', {
        player_id_value: playerId
      });
      
      // Single cleanup attempt
      try {
        await supabase.from('player_sessions').delete().eq('player_id', playerId);
        await supabase.from('player_queue').delete().eq('player_id', playerId);
      } catch (cleanupError) {
        console.log('Cleanup error (continuing anyway):', cleanupError);
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check room capacity  
      const { data: playerCountData } = await supabase.rpc('get_active_player_count');
      const currentPlayerCount = playerCountData || 0;
      
      if (currentPlayerCount >= MAX_PLAYERS) {
        console.log('Room is full');
        setSessionState(prev => ({
          ...prev,
          canJoin: false,
          kickReason: 'full'
        }));
        return false;
      }

      // Simple insert with RLS context set
      const sessionToken = crypto.randomUUID();
      const sessionData = {
        player_id: playerId,
        session_token: sessionToken,
        anonymous_id: `Player_${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        is_active: true,
        position_x: Math.floor(Math.random() * 10000),
        position_y: Math.floor(Math.random() * 10000),
        current_color: '#000000',
        current_tool: 'brush',
        current_size: 5,
      };

      const { error } = await supabase
        .from('player_sessions')
        .insert([sessionData]);

      if (error) {
        console.error('Insert failed:', error);
        
        // If it's a duplicate, try one more cleanup and retry
        if (error.code === '23505') {
          console.log('Duplicate detected, trying cleanup and retry...');
          await supabase.from('player_sessions').delete().eq('player_id', playerId);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { error: retryError } = await supabase
            .from('player_sessions')
            .insert([sessionData]);
            
          if (retryError) {
            console.error('Retry also failed:', retryError);
            return false;
          }
        } else {
          return false;
        }
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
      
      await cleanupPlayerSessions(playerId);
      
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
  }, [playerId, cleanupPlayerSessions]);

  // Update activity with RLS context
  const updateActivity = useCallback(async () => {
    if (!sessionState.isConnected || !sessionState.sessionToken) return;

    try {
      // Set RLS context before updating
      await supabase.rpc('set_player_context', {
        player_id_value: sessionState.playerId || playerId
      });
      
      await supabase
        .from('player_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_token', sessionState.sessionToken);
    } catch (error) {
      // If we can't update activity, session might be gone - disconnect
      console.log('Activity update failed, disconnecting');
      setSessionState(prev => ({
        ...prev,
        isConnected: false,
        isKicked: true,
        kickReason: 'disconnected'
      }));
    }
  }, [sessionState.isConnected, sessionState.sessionToken, sessionState.playerId, playerId]);

  // Update position with RLS context
  const updatePosition = useCallback(async (x: number, y: number) => {
    if (!sessionState.isConnected || !sessionState.sessionToken) return;

    try {
      // Set RLS context before updating
      await supabase.rpc('set_player_context', {
        player_id_value: sessionState.playerId || playerId
      });
      
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
  }, [sessionState.isConnected, sessionState.sessionToken, sessionState.playerId, playerId]);

  // Update paint state with RLS context
  const updatePaintState = useCallback(async (color?: string, tool?: string, size?: number) => {
    if (!sessionState.isConnected || !sessionState.sessionToken) return;

    try {
      // Set RLS context before updating
      await supabase.rpc('set_player_context', {
        player_id_value: sessionState.playerId || playerId
      });
      
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
  }, [sessionState.isConnected, sessionState.sessionToken, sessionState.playerId, playerId]);

  // Set up effects and cleanup
  useEffect(() => {
    let subscription: any = null;

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

    // Set up activity heartbeat if connected
    if (sessionState.isConnected) {
      activityIntervalRef.current = setInterval(updateActivity, 30000); // Every 30 seconds
    }

    // Set up less frequent cleanup
    cleanupIntervalRef.current = setInterval(async () => {
      await supabase.rpc('cleanup_inactive_sessions');
      refreshPlayerCount();
    }, 60000); // Every minute

    return () => {
      if (subscription) subscription.unsubscribe();
      if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
      if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
    };
  }, [sessionState.isConnected, updateActivity]);

  // Cleanup on unmount
  useEffect(() => {
    const cleanup = () => {
      if (sessionState.isConnected) {
        cleanupPlayerSessions(playerId);
      }
    };

    // Only cleanup on page unload, not visibility change
    window.addEventListener('beforeunload', cleanup);
    
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [sessionState.isConnected, playerId, cleanupPlayerSessions]);

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
