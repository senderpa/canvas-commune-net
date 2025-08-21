-- Fix security definer view issue by removing the problematic view
-- and implementing a better approach

-- Drop the problematic view
DROP VIEW IF EXISTS public.player_game_state;

-- Create a secure function to get public player data without exposing sensitive info
CREATE OR REPLACE FUNCTION get_public_player_data()
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
  last_activity timestamptz,
  session_start timestamptz,
  collision_count integer,
  is_hit boolean,
  hit_timestamp timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  WHERE ps.is_active = true;
END;
$$;

-- Update the RLS policy to be more restrictive - only allow reading specific columns
-- by removing the overly permissive policy and creating a more restrictive one
DROP POLICY IF EXISTS "Public can view game state" ON player_sessions;

-- Create a more restrictive policy that allows reading only non-sensitive data
-- This policy will work with our new functions
CREATE POLICY "Restricted public read access" 
ON player_sessions 
FOR SELECT 
USING (false); -- Block direct table access - force use of functions

-- Allow access through our secure functions by granting execute permissions
GRANT EXECUTE ON FUNCTION get_public_player_data() TO anon;
GRANT EXECUTE ON FUNCTION get_my_session_data(text) TO anon;
GRANT EXECUTE ON FUNCTION get_active_player_count() TO anon;
GRANT EXECUTE ON FUNCTION get_anonymous_player_data() TO anon;
GRANT EXECUTE ON FUNCTION check_emoji_collision(text, integer, integer) TO anon;