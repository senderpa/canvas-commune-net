-- MultiPainter Database Setup
-- Run this in your Supabase SQL editor

-- Create player_sessions table
CREATE TABLE IF NOT EXISTS player_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT UNIQUE NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for the table
CREATE POLICY "Anyone can insert player sessions" ON player_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update player sessions" ON player_sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can view active sessions" ON player_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can delete player sessions" ON player_sessions FOR DELETE USING (true);

-- Create function to clean up inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  -- Remove sessions older than 10 minutes
  DELETE FROM player_sessions 
  WHERE session_start < NOW() - INTERVAL '10 minutes';
  
  -- Remove sessions with no activity for 1 minute
  DELETE FROM player_sessions 
  WHERE last_activity < NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically clean up sessions periodically
-- (Optional: You can also set up a cron job for this)
CREATE OR REPLACE FUNCTION trigger_cleanup_sessions()
RETURNS trigger AS $$
BEGIN
  PERFORM cleanup_inactive_sessions();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for the table (so changes are pushed to connected clients)
ALTER PUBLICATION supabase_realtime ADD TABLE player_sessions;