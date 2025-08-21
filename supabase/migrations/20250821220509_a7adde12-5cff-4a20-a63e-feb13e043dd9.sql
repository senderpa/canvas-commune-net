-- Fix rate limiting function to work with RLS
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_player_id text, p_action_type text, p_max_actions integer DEFAULT 60, p_window_minutes integer DEFAULT 1)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  -- Clean up old rate limit entries (run as security definer)
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  -- Get current action count in window (bypass RLS by using security definer)
  SELECT COALESCE(SUM(action_count), 0) INTO current_count
  FROM rate_limits
  WHERE player_id = p_player_id 
    AND action_type = p_action_type
    AND window_start > NOW() - (p_window_minutes || ' minutes')::interval;
  
  -- Check if under limit
  IF current_count >= p_max_actions THEN
    RETURN FALSE;
  END IF;
  
  -- Record this action (bypass RLS by using security definer)
  INSERT INTO rate_limits (player_id, action_type, action_count, window_start)
  VALUES (p_player_id, p_action_type, 1, NOW())
  ON CONFLICT (player_id, action_type) 
  DO UPDATE SET 
    action_count = CASE 
      WHEN rate_limits.window_start < NOW() - (p_window_minutes || ' minutes')::interval 
      THEN 1 
      ELSE rate_limits.action_count + 1 
    END,
    window_start = CASE 
      WHEN rate_limits.window_start < NOW() - (p_window_minutes || ' minutes')::interval 
      THEN NOW() 
      ELSE rate_limits.window_start 
    END;
  
  RETURN TRUE;
END;
$function$;