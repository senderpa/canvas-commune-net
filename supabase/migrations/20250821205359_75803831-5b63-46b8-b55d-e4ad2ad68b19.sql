-- Create a more aggressive cleanup function for inactive sessions
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove sessions older than 30 minutes (max session duration)
  DELETE FROM player_sessions 
  WHERE session_start < NOW() - INTERVAL '30 minutes';
  
  -- Remove sessions with no activity for 2 minutes (much shorter timeout)
  DELETE FROM player_sessions 
  WHERE last_activity < NOW() - INTERVAL '2 minutes';
  
  -- Remove queue entries older than 10 minutes
  DELETE FROM player_queue 
  WHERE joined_at < NOW() - INTERVAL '10 minutes';
  
  -- Promote people from queue to fill empty slots
  PERFORM promote_from_queue();
END;
$$;

-- Update get_active_player_count to be more strict
CREATE OR REPLACE FUNCTION public.get_active_player_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only count sessions that are both active AND have had activity in the last 2 minutes
  RETURN (SELECT COUNT(*) FROM player_sessions 
          WHERE is_active = true 
          AND last_activity > NOW() - INTERVAL '2 minutes');
END;
$$;

-- Create function to update activity (bring back but make it lightweight)
CREATE OR REPLACE FUNCTION public.update_player_activity(
  p_session_token text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simple activity update
  UPDATE player_sessions 
  SET last_activity = NOW()
  WHERE session_token = p_session_token 
    AND is_active = true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_player_activity(text) TO authenticated, anon;