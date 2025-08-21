import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

interface PlayerSession {
  isActive: boolean;
  sessionToken: string | null;
  playerId: string | null;
  collisionCount: number;
  kickReason: 'timeout' | 'inactivity' | 'full' | 'disconnected' | 'hits' | null;
  joinSession: () => Promise<void>;
  leaveSession: () => Promise<void>;
  handleCollision: () => void;
  sessionStrokeCount: number;
}

export const usePlayerSession = () => {
  const [isActive, setIsActive] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [collisionCount, setCollisionCount] = useState(0);
  const [kickReason, setKickReason] = useState<'timeout' | 'inactivity' | 'full' | 'disconnected' | 'hits' | null>(null);
  const [sessionStrokeCount, setSessionStrokeCount] = useState(0);

  const isActiveRef = useRef(isActive);
  const sessionTokenRef = useRef(sessionToken);
  const collisionCountRef = useRef(collisionCount);
  const kickReasonRef = useRef(kickReason);

  useEffect(() => {
    isActiveRef.current = isActive;
    sessionTokenRef.current = sessionToken;
    collisionCountRef.current = collisionCount;
    kickReasonRef.current = kickReason;
  }, [isActive, sessionToken, collisionCount, kickReason]);

  const cleanup = useCallback(() => {
    setIsActive(false);
    setSessionToken(null);
    setCollisionCount(0);
    setKickReason(null);
  }, []);

  const handleCollision = useCallback(() => {
    if (!isActiveRef.current) return;
    
    setCollisionCount(prev => {
      const newCount = prev + 1;
      console.log(`Collision detected! Count: ${newCount}/3`);
      
      // Check if player should be eliminated (3 hits)
      if (newCount >= 3) {
        console.log('Player eliminated due to 3 hits!');
        setKickReason('hits');
        cleanup();
      }
      
      return newCount;
    });
  }, [cleanup]);

  const joinSession = useCallback(async () => {
    setIsActive(true);
    setCollisionCount(0);
    setKickReason(null);

    const newSessionToken = uuidv4();
    const newPlayerId = uuidv4();
    const anonymousId = `Player_${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;

    setSessionToken(newSessionToken);
    setPlayerId(newPlayerId);

    try {
      // Insert into player_sessions table directly
      const { error } = await supabase
        .from('player_sessions')
        .insert({
          session_token: newSessionToken,
          player_id: newPlayerId,
          anonymous_id: anonymousId,
          is_active: true,
          position_x: 5000,
          position_y: 5000,
          current_color: '#ff0080',
          current_tool: 'brush',
          current_size: 5,
          selected_emoji: '😀',
          collision_count: 0
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error joining session:', error);
      setIsActive(false);
      setSessionToken(null);
      setPlayerId(null);
    }
  }, []);

  const leaveSession = useCallback(async () => {
    if (!sessionTokenRef.current || !isActiveRef.current) return;

    try {
      // If we're leaving due to 3 hits, set the reason appropriately
      if (collisionCountRef.current >= 3 && !kickReasonRef.current) {
        setKickReason('hits');
      } else if (!kickReasonRef.current) {
        setKickReason('disconnected');
      }

      // Delete from player_sessions table directly
      await supabase
        .from('player_sessions')
        .delete()
        .eq('session_token', sessionTokenRef.current);

      cleanup();
    } catch (error) {
      console.error('Error leaving session:', error);
      cleanup();
    }
  }, [cleanup]);

  useEffect(() => {
    const checkSession = async () => {
      if (!sessionToken) return;

      const { data, error } = await supabase
        .from('player_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      if (error) {
        console.error('Error fetching session:', error);
        cleanup();
        return;
      }

      if (!data) {
        console.log('Session not found, cleaning up.');
        cleanup();
        return;
      }

      // Check if the session is no longer active
      if (!data.is_active) {
        setKickReason('timeout');
        cleanup();
        return;
      }
    };

    checkSession();
  }, [sessionToken, cleanup]);

  return {
    isActive,
    sessionToken,
    playerId,
    collisionCount,
    kickReason,
    joinSession,
    leaveSession,
    handleCollision,
    sessionStrokeCount
  };
};
