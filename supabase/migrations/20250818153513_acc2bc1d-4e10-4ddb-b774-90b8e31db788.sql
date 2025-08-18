-- MultiPainteR Database Schema
-- Create player sessions table for real multiplayer
CREATE TABLE IF NOT EXISTS player_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT UNIQUE NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  current_color TEXT DEFAULT '#000000',
  current_tool TEXT DEFAULT 'brush',
  current_size INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create strokes table for persistent drawing data
CREATE TABLE IF NOT EXISTS strokes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  points JSONB NOT NULL, -- Array of {x, y, pressure} points
  color TEXT NOT NULL,
  size INTEGER NOT NULL,
  tool TEXT NOT NULL, -- 'brush' or 'eraser'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  world_x INTEGER NOT NULL,
  world_y INTEGER NOT NULL
);

-- Enable Row Level Security
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strokes ENABLE ROW LEVEL SECURITY;

-- Create policies for player_sessions (public access for this demo)
CREATE POLICY "Anyone can view active sessions" ON player_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON player_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON player_sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sessions" ON player_sessions FOR DELETE USING (true);

-- Create policies for strokes (public access for collaborative drawing)
CREATE POLICY "Anyone can view strokes" ON strokes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert strokes" ON strokes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update strokes" ON strokes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete strokes" ON strokes FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_sessions_active ON player_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_player_sessions_player_id ON player_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_strokes_player_id ON strokes(player_id);
CREATE INDEX IF NOT EXISTS idx_strokes_created_at ON strokes(created_at);
CREATE INDEX IF NOT EXISTS idx_strokes_world_position ON strokes(world_x, world_y);

-- Function to clean up inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  -- Remove sessions older than 30 minutes
  DELETE FROM player_sessions 
  WHERE session_start < NOW() - INTERVAL '30 minutes';
  
  -- Remove sessions with no activity for 5 minutes
  DELETE FROM player_sessions 
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE player_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE strokes;