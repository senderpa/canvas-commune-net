-- Security Fix: Phase 2 - Fix security linter warnings

-- Fix search_path for all functions to prevent security issues
DROP FUNCTION IF EXISTS generate_anonymous_id();
CREATE OR REPLACE FUNCTION generate_anonymous_id()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'Player_' || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
END;
$$;

DROP FUNCTION IF EXISTS get_active_player_count();
CREATE OR REPLACE FUNCTION get_active_player_count()
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM player_sessions WHERE is_active = true);
END;
$$;

DROP FUNCTION IF EXISTS get_queue_count();
CREATE OR REPLACE FUNCTION get_queue_count()
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM player_queue);
END;
$$;

DROP FUNCTION IF EXISTS check_emoji_collision(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION check_emoji_collision(
  p_session_token TEXT,
  p_position_x INTEGER,
  p_position_y INTEGER
) RETURNS TABLE(
  collided_with_anonymous_id TEXT,
  collided_with_emoji TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.anonymous_id,
    ps.selected_emoji
  FROM player_sessions ps
  WHERE ps.session_token != p_session_token
    AND ps.is_active = true
    AND ABS(ps.position_x - p_position_x) < 50
    AND ABS(ps.position_y - p_position_y) < 50;
END;
$$;

-- Drop the security definer view and create regular functions instead
DROP VIEW IF EXISTS public_player_data;

-- Create secure function to get anonymous player data instead of view
CREATE OR REPLACE FUNCTION get_anonymous_player_data()
RETURNS TABLE(
  anonymous_id TEXT,
  selected_emoji TEXT,
  current_color TEXT,
  current_tool TEXT,
  current_size INTEGER,
  general_area_x INTEGER,
  general_area_y INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.anonymous_id,
    ps.selected_emoji,
    ps.current_color,
    ps.current_tool,
    ps.current_size,
    ROUND(ps.position_x/100)*100 as general_area_x,
    ROUND(ps.position_y/100)*100 as general_area_y
  FROM player_sessions ps
  WHERE ps.is_active = true;
END;
$$;