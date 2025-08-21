-- Fix critical security vulnerability: Restrict access to session tokens
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view anonymized session data" ON player_sessions;

-- Create a secure policy that only allows users to see their own session data
CREATE POLICY "Players can view their own session data" 
ON player_sessions 
FOR SELECT 
USING (validate_session_ownership(session_token));

-- Create a separate policy for system functions to access session data
CREATE POLICY "System functions can read session data" 
ON player_sessions 
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Update the get_public_player_data function to ensure it works with new policies
-- This function is already secure as it doesn't expose session_token
CREATE OR REPLACE FUNCTION public.get_public_player_data()
RETURNS TABLE(id uuid, anonymous_id text, position_x integer, position_y integer, current_color text, current_tool text, current_size integer, selected_emoji text, is_active boolean, last_activity timestamp with time zone, session_start timestamp with time zone, collision_count integer, is_hit boolean, hit_timestamp timestamp with time zone)
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