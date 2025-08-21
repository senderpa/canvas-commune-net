-- Fix the security warning for the join_player_session function
DROP FUNCTION IF EXISTS join_player_session(TEXT, TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION join_player_session(
  p_player_id TEXT,
  p_session_token TEXT,
  p_anonymous_id TEXT,
  p_position_x INTEGER DEFAULT 0,
  p_position_y INTEGER DEFAULT 0
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get current player count
  SELECT COUNT(*) INTO current_count 
  FROM player_sessions 
  WHERE is_active = true;
  
  -- Check if room is full
  IF current_count >= 100 THEN
    RETURN FALSE;
  END IF;
  
  -- Clean up any existing sessions for this player
  DELETE FROM player_sessions WHERE player_id = p_player_id;
  DELETE FROM player_queue WHERE player_id = p_player_id;
  
  -- Insert new session
  INSERT INTO player_sessions (
    player_id,
    session_token, 
    anonymous_id,
    is_active,
    position_x,
    position_y,
    current_color,
    current_tool,
    current_size,
    session_start,
    last_activity
  ) VALUES (
    p_player_id,
    p_session_token,
    p_anonymous_id,
    true,
    p_position_x,
    p_position_y,
    '#ff0080',
    'brush',
    5,
    now(),
    now()
  );
  
  RETURN TRUE;
END;
$$;