-- Update the get_active_player_count function to only count sessions with recent activity
CREATE OR REPLACE FUNCTION public.get_active_player_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only count sessions that are both active AND have had activity in the last 5 minutes
  RETURN (SELECT COUNT(*) FROM player_sessions 
          WHERE is_active = true 
          AND last_activity > NOW() - INTERVAL '5 minutes');
END;
$function$

-- Clean up all inactive sessions immediately
DELETE FROM player_sessions 
WHERE session_start < NOW() - INTERVAL '60 minutes'
   OR last_activity < NOW() - INTERVAL '5 minutes';

-- Clean up old queue entries
DELETE FROM player_queue 
WHERE joined_at < NOW() - INTERVAL '15 minutes';