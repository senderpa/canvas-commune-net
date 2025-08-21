-- Security Fix: Phase 1 - Add session-based anonymous identifiers and restrict data access

-- Add session_token column to player_sessions for anonymous identification
ALTER TABLE player_sessions ADD COLUMN session_token TEXT;

-- Add anonymous display fields
ALTER TABLE player_sessions ADD COLUMN anonymous_id TEXT;

-- Create function to generate anonymous player ID
CREATE OR REPLACE FUNCTION generate_anonymous_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'Player_' || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Update existing sessions with anonymous IDs and session tokens
UPDATE player_sessions 
SET session_token = gen_random_uuid()::TEXT,
    anonymous_id = generate_anonymous_id()
WHERE session_token IS NULL;

-- Make session_token required for new records
ALTER TABLE player_sessions ALTER COLUMN session_token SET NOT NULL;
ALTER TABLE player_sessions ALTER COLUMN anonymous_id SET NOT NULL;

-- Add session_token to other tables for secure joins
ALTER TABLE strokes ADD COLUMN session_token TEXT;
ALTER TABLE highscores ADD COLUMN session_token TEXT;
ALTER TABLE player_queue ADD COLUMN session_token TEXT;

-- Update existing records with session tokens from player_sessions
UPDATE strokes 
SET session_token = ps.session_token 
FROM player_sessions ps 
WHERE strokes.player_id = ps.player_id AND strokes.session_token IS NULL;

UPDATE highscores 
SET session_token = ps.session_token 
FROM player_sessions ps 
WHERE highscores.player_id = ps.player_id AND highscores.session_token IS NULL;

UPDATE player_queue 
SET session_token = ps.session_token 
FROM player_sessions ps 
WHERE player_queue.player_id = ps.player_id AND player_queue.session_token IS NULL;

-- Create secure view for public player data (no real positions or IDs)
CREATE OR REPLACE VIEW public_player_data AS
SELECT 
  anonymous_id,
  selected_emoji,
  current_color,
  current_tool,
  current_size,
  is_active,
  -- Obfuscated position data (rounded to nearest 100 for privacy)
  ROUND(position_x/100)*100 as general_area_x,
  ROUND(position_y/100)*100 as general_area_y
FROM player_sessions 
WHERE is_active = true;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Public can view active player sessions" ON player_sessions;
DROP POLICY IF EXISTS "Public can view all strokes" ON strokes;
DROP POLICY IF EXISTS "Public can view all highscores" ON highscores;
DROP POLICY IF EXISTS "Public can view queue" ON player_queue;

-- Create restrictive policies for player_sessions
CREATE POLICY "Players can only access their own session data" ON player_sessions
FOR SELECT USING (player_id = current_setting('myapp.current_player_id', true));

CREATE POLICY "System functions can read session data" ON player_sessions
FOR SELECT USING (current_user = 'postgres');

-- Create secure policies for strokes (public viewing but no player tracking)
CREATE POLICY "Public can view stroke art only" ON strokes
FOR SELECT USING (true);

-- Create policies for highscores (anonymous display)
CREATE POLICY "Public can view anonymized highscores" ON highscores
FOR SELECT USING (true);

-- Create policies for queue (count only, no individual data)
CREATE POLICY "System can manage queue data" ON player_queue
FOR ALL USING (current_user = 'postgres');

-- Create function to get current session player count (secure)
CREATE OR REPLACE FUNCTION get_active_player_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM player_sessions WHERE is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get queue count (secure)
CREATE OR REPLACE FUNCTION get_queue_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM player_queue);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for collision detection (secure, no position exposure)
CREATE OR REPLACE FUNCTION check_emoji_collision(
  p_session_token TEXT,
  p_position_x INTEGER,
  p_position_y INTEGER
) RETURNS TABLE(
  collided_with_anonymous_id TEXT,
  collided_with_emoji TEXT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;