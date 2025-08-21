-- Update get_public_player_data to only return currently active players
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
    AND ps.last_activity > NOW() - INTERVAL '2 minutes';
END;
$$;