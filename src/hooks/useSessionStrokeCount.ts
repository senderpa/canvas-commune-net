import { useState, useCallback, useEffect } from 'react';

export const useSessionStrokeCount = (playerId?: string, isConnected?: boolean) => {
  const [sessionStrokeCount, setSessionStrokeCount] = useState(0);

  const incrementStrokeCount = useCallback(() => {
    setSessionStrokeCount(prev => prev + 1);
  }, []);

  const resetStrokeCount = useCallback(() => {
    setSessionStrokeCount(0);
  }, []);

  // Reset stroke count when starting a new session
  useEffect(() => {
    if (!isConnected || !playerId) {
      setSessionStrokeCount(0);
    }
  }, [isConnected, playerId]);

  return {
    sessionStrokeCount,
    incrementStrokeCount,
    resetStrokeCount
  };
};