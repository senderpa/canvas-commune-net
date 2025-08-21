-- Fix RLS policies for player_sessions to be much simpler and work properly
DROP POLICY IF EXISTS "Players can create their own sessions" ON player_sessions;
DROP POLICY IF EXISTS "Players can update their own sessions" ON player_sessions; 
DROP POLICY IF EXISTS "Players can remove their own sessions" ON player_sessions;
DROP POLICY IF EXISTS "Players can only access their own session data" ON player_sessions;
DROP POLICY IF EXISTS "System functions can read session data" ON player_sessions;

-- Create simple, working policies
CREATE POLICY "Anyone can create sessions" 
ON player_sessions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read sessions" 
ON player_sessions FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update sessions" 
ON player_sessions FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete sessions" 
ON player_sessions FOR DELETE 
USING (true);

-- Also fix player_queue policies to be simpler
DROP POLICY IF EXISTS "Players can join queue" ON player_queue;
DROP POLICY IF EXISTS "System can manage queue" ON player_queue;
DROP POLICY IF EXISTS "System can remove from queue" ON player_queue; 
DROP POLICY IF EXISTS "System can manage queue data" ON player_queue;

CREATE POLICY "Anyone can manage queue" 
ON player_queue FOR ALL 
USING (true);

-- Create a simple function to join session without RLS complexity
CREATE OR REPLACE FUNCTION join_player_session(
  p_player_id TEXT,
  p_session_token TEXT,
  p_anonymous_id TEXT,
  p_position_x INTEGER DEFAULT 0,
  p_position_y INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;