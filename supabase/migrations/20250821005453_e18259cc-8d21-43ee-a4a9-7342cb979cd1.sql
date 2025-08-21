-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.validate_player_session(session_player_id text)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Basic validation - could be enhanced with more sophisticated checks
  RETURN session_player_id IS NOT NULL AND length(session_player_id) > 0;
END;
$$;