-- Improve session cleanup to be more aggressive and accurate
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove sessions older than 10 minutes (reduced from 30 minutes)
  DELETE FROM player_sessions 
  WHERE session_start < NOW() - INTERVAL '10 minutes';
  
  -- Remove sessions with no activity for 1 minute (reduced from 2 minutes)
  DELETE FROM player_sessions 
  WHERE last_activity < NOW() - INTERVAL '1 minute';
  
  -- Remove queue entries older than 5 minutes (reduced from 10 minutes)
  DELETE FROM player_queue 
  WHERE joined_at < NOW() - INTERVAL '5 minutes';
  
  -- Promote people from queue to fill empty slots
  PERFORM promote_from_queue();
END;
$$;

-- Update get_active_player_count to use the same 1-minute threshold
CREATE OR REPLACE FUNCTION public.get_active_player_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only count sessions that are both active AND have had activity in the last 1 minute
  RETURN (SELECT COUNT(*) FROM player_sessions 
          WHERE is_active = true 
          AND last_activity > NOW() - INTERVAL '1 minute');
END;
$$;

-- Update get_public_player_data to use same 1-minute threshold
CREATE OR REPLACE FUNCTION public.get_public_player_data()
RETURNS TABLE(
  id uuid,
  anonymous_id text,
  position_x integer,
  position_y integer,
  current_color text,
  current_tool text,
  current_size integer,
  selected_emoji text,
  is_active boolean,
  last_activity timestamp with time zone,
  session_start timestamp with time zone,
  collision_count integer,
  is_hit boolean,
  hit_timestamp timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.anonymous_id,
    ps.position_x,
    ps.position_y,
    ps.current_color,
    ps.current_tool,
    ps.current_size,
    ps.selected_emoji,
    ps.is_active,
    ps.last_activity,
    ps.session_start,
    ps.collision_count,
    ps.is_hit,
    ps.hit_timestamp
  FROM player_sessions ps
  WHERE ps.is_active = true 
    AND ps.last_activity > NOW() - INTERVAL '1 minute';
END;
$$;