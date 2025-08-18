-- Update cleanup function to be more aggressive and accurate
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove sessions older than 15 minutes (more aggressive)
  DELETE FROM player_sessions 
  WHERE session_start < NOW() - INTERVAL '15 minutes';
  
  -- Remove sessions with no activity for 2 minutes (more aggressive)
  DELETE FROM player_sessions 
  WHERE last_activity < NOW() - INTERVAL '2 minutes';
  
  -- Remove queue entries older than 5 minutes (abandoned)
  DELETE FROM player_queue 
  WHERE joined_at < NOW() - INTERVAL '5 minutes';
  
  -- Promote people from queue to fill empty slots
  PERFORM promote_from_queue();
END;
$function$