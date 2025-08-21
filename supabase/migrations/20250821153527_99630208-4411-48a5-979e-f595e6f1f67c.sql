-- Fix security issues: set proper search_path for the function
CREATE OR REPLACE FUNCTION public.set_player_context(player_id_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set the current player ID for RLS policies
  PERFORM set_config('myapp.current_player_id', player_id_value, true);
END;
$$;