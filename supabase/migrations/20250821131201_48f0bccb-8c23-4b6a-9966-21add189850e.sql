-- Fix the get_anonymous_player_data function return type issue
DROP FUNCTION IF EXISTS public.get_anonymous_player_data();

CREATE OR REPLACE FUNCTION public.get_anonymous_player_data()
 RETURNS TABLE(anonymous_id text, selected_emoji text, current_color text, current_tool text, current_size integer, general_area_x integer, general_area_y integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ps.anonymous_id,
    ps.selected_emoji,
    ps.current_color,
    ps.current_tool,
    ps.current_size,
    (ROUND(ps.position_x::numeric/100)*100)::integer as general_area_x,
    (ROUND(ps.position_y::numeric/100)*100)::integer as general_area_y
  FROM player_sessions ps
  WHERE ps.is_active = true;
END;
$function$;

-- Improve session cleanup and collision detection
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

-- Force cleanup any orphaned sessions
DELETE FROM player_sessions WHERE session_start < NOW() - INTERVAL '1 hour';
DELETE FROM player_queue WHERE joined_at < NOW() - INTERVAL '1 hour';