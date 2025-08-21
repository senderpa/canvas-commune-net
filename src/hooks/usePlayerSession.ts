
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
    sessionToken: null,
  });

  // Throttling ref for position updates
  const positionThrottleRef = useRef<{
    lastUpdate: number;
    lastPosition: string;
  }>({ lastUpdate: 0, lastPosition: '' });

  const [playerId] = useState(() => {
    // Try to get existing playerId from localStorage
    let storedId = localStorage.getItem('playerId');
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('playerId', storedId);
    }
    return storedId;
  });

  // Enhanced cleanup function with better error handling
  const cleanupPlayerSessions = useCallback(async (playerIdToClean: string) => {
    console.log('Starting cleanup for player:', playerIdToClean);
    
    try {
      // Clean up sessions first
      const { error: sessionError } = await supabase
        .from('player_sessions')
        .delete()
        .eq('player_id', playerIdToClean);
      
      if (sessionError && sessionError.code !== '23503') {
        console.log('Session cleanup error (may be expected):', sessionError);
      }
      
      // Clean up queue entries
      const { error: queueError } = await supabase
        .from('player_queue')
        .delete()
        .eq('player_id', playerIdToClean);
      
      if (queueError && queueError.code !== '23503') {
        console.log('Queue cleanup error (may be expected):', queueError);
      }
      
      console.log('Cleanup completed for player:', playerIdToClean);
      
      // Wait a bit longer for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log('Cleanup error (may be expected):', error);
    }
  }, []);

  // Join session (only called when clicking "Start Painting")
  const joinSession = useCallback(async () => {
    try {
      console.log('Attempting to join session...');
      
      // Force aggressive cleanup first - retry multiple times if needed
      for (let cleanupAttempt = 0; cleanupAttempt < 3; cleanupAttempt++) {
        console.log(`Cleanup attempt ${cleanupAttempt + 1}`);
        await cleanupPlayerSessions(playerId);
        
        // Wait for cleanup to propagate
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify cleanup worked by checking if session exists
        const { data: existingSession } = await supabase
          .from('player_sessions')
          .select('id')
          .eq('player_id', playerId)
          .single();
          
        if (!existingSession) {
          console.log('Cleanup successful');
          break;
        }
        
        console.log('Session still exists, retrying cleanup...');
      }

      // Check player count using secure function
      const { data: playerCountData, error: countError } = await supabase
        .rpc('get_active_player_count');

      if (countError) {
        console.error('Error checking player count:', countError);
        return false;
      }

      const currentPlayerCount = playerCountData || 0;
      if (currentPlayerCount >= MAX_PLAYERS) {
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

      // Room has space - join directly with improved retry logic
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

      let retries = 0;
      const maxRetries = 5;
      let lastError = null;

      while (retries < maxRetries) {
        try {
          // Clean up again before each retry
          if (retries > 0) {
            console.log(`Retry ${retries}: Cleaning up again...`);
            await cleanupPlayerSessions(playerId);
          }

          const { error: insertError } = await supabase
            .from('player_sessions')
            .insert([sessionData]);

          if (!insertError) {
            // Success!
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
          }

          lastError = insertError;

          if (insertError.code === '23505') { // Duplicate key constraint
            console.log(`Retry ${retries + 1}: Duplicate key, will clean up and retry...`);
            retries++;
            // Exponential backoff with longer delays
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
          } else {
            throw insertError;
          }
        } catch (insertError) {
          lastError = insertError;
          retries++;
          if (retries < maxRetries) {
            console.log(`Error on retry ${retries}, waiting before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
          }
        }
      }

      console.error('Error joining session after all retries:', lastError);
      return false;
    } catch (error) {
      console.error('Join session error:', error);
      return false;
    }
  }, [playerId, cleanupPlayerSessions]);

  // Leave session with immediate cleanup
  const leaveSession = useCallback(async () => {
    try {
      console.log('Leaving session for player:', playerId);
      
      // Force immediate cleanup and state reset
      await cleanupPlayerSessions(playerId);
      
      // Immediately update local state
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

  // Update position with throttling for smoother movement
  const updatePosition = useCallback(async (x: number, y: number) => {
    if (!sessionState.isConnected) return;

    // Throttle position updates to reduce database load and improve smoothness
    const throttleKey = `pos_${Math.floor(x/10)}_${Math.floor(y/10)}`;
    const now = Date.now();
    
    // Only update if position changed significantly (10px threshold) or enough time passed (100ms)
    if (!positionThrottleRef.current.lastUpdate || 
        !positionThrottleRef.current.lastPosition || 
        positionThrottleRef.current.lastPosition !== throttleKey || 
        now - positionThrottleRef.current.lastUpdate > 100) {
      
      positionThrottleRef.current.lastUpdate = now;
      positionThrottleRef.current.lastPosition = throttleKey;
      
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
        // Silently handle position update errors to avoid console spam
        if (error.code !== '23503') { // Ignore foreign key constraint errors
          console.error('Position update error:', error);
        }
      }
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
      if (sessionState.isConnected) {
        console.log('Running cleanup for connected player');
        await cleanupPlayerSessions(playerId);
      }
    };

    // REMOVED the aggressive visibility change handler that was causing immediate logouts
    // Users should only be logged out due to inactivity timeout or manual leave

    // Add cleanup listeners for page unload only
    const handleBeforeUnload = () => {
      console.log('Page unloading - cleaning up session');
      if (sessionState.isConnected && playerId) {
        // Use sendBeacon for reliable cleanup on page unload
        const data = JSON.stringify({ player_id: playerId });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/cleanup-player', data);
        }
        
        // Also try direct cleanup
        cleanup();
      }
    };

    // Only add beforeunload handler, not visibility change
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    // Refresh player count and queue using secure functions
    const refreshPlayerCount = async () => {
      try {
        // Get active players count using secure function
        const { data: activeCount, error: sessionsError } = await supabase
          .rpc('get_active_player_count');

        // Get queue count using secure function
        const { data: queueCount, error: queueError } = await supabase
          .rpc('get_queue_count');

        if (!sessionsError && !queueError) {
          console.log('Current active players:', activeCount, 'Queue:', queueCount);
          
          setSessionState(prev => ({
            ...prev,
            playerCount: activeCount || 0,
            queueCount: queueCount || 0,
            canJoin: (activeCount || 0) < MAX_PLAYERS,
            queuePosition: 0, // Queue position will be handled separately if needed
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

    // Initial cleanup and player count refresh
    const initialSetup = async () => {
      await supabase.rpc('cleanup_inactive_sessions');
      refreshPlayerCount();
    };
    initialSetup();

    // Set up activity heartbeat - more frequent to prevent timeouts
    if (sessionState.isConnected) {
      activityInterval = setInterval(updateActivity, 15000); // Every 15 seconds
    }

    // Set up cleanup interval - run more frequently to prevent stale sessions
    cleanupInterval = setInterval(async () => {
      try {
        // Run cleanup more frequently to prevent stale session accumulation
        await supabase.rpc('cleanup_inactive_sessions');

        // Check if current player session still exists (only if connected)
        if (sessionState.isConnected) {
          const { data: currentSession } = await supabase
            .from('player_sessions')
            .select('*')
            .eq('player_id', playerId)
            .single();

          // Only kick if session doesn't exist AND they've been "connected" for a while
          if (!currentSession) {
            console.log('Player session was cleaned up by server - forcing logout');
            
            // Force immediate state reset and cleanup
            await cleanupPlayerSessions(playerId);
            
            setSessionState(prev => ({
              ...prev,
              isConnected: false,
              isKicked: true,
              kickReason: 'timeout',
              canJoin: false, // Force them to wait
              playerId: null,
              sessionToken: null,
            }));
            
            // Allow rejoin after 2 seconds
            setTimeout(() => {
              setSessionState(prev => ({
                ...prev,
                canJoin: true,
                isKicked: false,
                kickReason: null,
              }));
            }, 2000);
          }
        }

        refreshPlayerCount();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, 30000); // Every 30 seconds to keep counts accurate

    return () => {
      // Cleanup subscriptions
      if (subscription) subscription.unsubscribe();
      if (activityInterval) clearInterval(activityInterval);
      if (cleanupInterval) clearInterval(cleanupInterval);
      
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      // Final cleanup
      if (sessionState.isConnected) {
        cleanup();
      }
    };
  }, [sessionState.isConnected, updateActivity, playerId, cleanupPlayerSessions]);

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
    resetKick: () => {
      // Full reset function
      setSessionState(prev => ({ 
        ...prev, 
        isKicked: false, 
        kickReason: null,
        canJoin: true,
        isConnected: false,
        playerId: null,
        sessionToken: null,
      }));
    },
  };
};
