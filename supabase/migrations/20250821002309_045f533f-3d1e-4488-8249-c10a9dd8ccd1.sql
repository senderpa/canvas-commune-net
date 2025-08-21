-- Update cleanup function to increase timers
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove sessions older than 60 minutes (increased from 15 minutes)
  DELETE FROM player_sessions 
  WHERE session_start < NOW() - INTERVAL '60 minutes';
  
  -- Remove sessions with no activity for 5 minutes (increased from 2 minutes)
  DELETE FROM player_sessions 
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
  
  -- Remove queue entries older than 10 minutes (increased proportionally)
  DELETE FROM player_queue 
  WHERE joined_at < NOW() - INTERVAL '10 minutes';
  
  -- Promote people from queue to fill empty slots
  PERFORM promote_from_queue();
END;
$function$;