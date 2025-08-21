-- Reduce collision sensitivity to prevent auto-kicks
CREATE OR REPLACE FUNCTION public.check_emoji_collision(p_session_token text, p_position_x integer, p_position_y integer)
 RETURNS TABLE(collided_with_anonymous_id text, collided_with_emoji text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ps.anonymous_id,
    ps.selected_emoji
  FROM player_sessions ps
  WHERE ps.session_token != p_session_token
    AND ps.is_active = true
    -- Increased collision distance from 50 to 80 pixels to reduce false positives
    AND ABS(ps.position_x - p_position_x) < 80
    AND ABS(ps.position_y - p_position_y) < 80;
END;
$function$;