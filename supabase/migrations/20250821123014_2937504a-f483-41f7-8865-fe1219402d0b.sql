-- Update the cleanup function to have proper timeout settings
-- 5 minutes for inactivity timeout, 60 minutes for max session duration
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove sessions older than 60 minutes (max session duration)
  DELETE FROM player_sessions 
  WHERE session_start < NOW() - INTERVAL '60 minutes';
  
  -- Remove sessions with no activity for 5 minutes (inactivity timeout)
  DELETE FROM player_sessions 
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
  
  -- Remove queue entries older than 15 minutes
  DELETE FROM player_queue 
  WHERE joined_at < NOW() - INTERVAL '15 minutes';
  
  -- Promote people from queue to fill empty slots
  PERFORM promote_from_queue();
END;
$function$;