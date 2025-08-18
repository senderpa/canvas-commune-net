-- Add queue management table
CREATE TABLE IF NOT EXISTS player_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT UNIQUE NOT NULL,
  queue_position INTEGER NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE player_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for player_queue
CREATE POLICY "Anyone can view queue" ON player_queue FOR SELECT USING (true);
CREATE POLICY "Anyone can insert to queue" ON player_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update queue" ON player_queue FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete from queue" ON player_queue FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_queue_position ON player_queue(queue_position);
CREATE INDEX IF NOT EXISTS idx_player_queue_player_id ON player_queue(player_id);

-- Update cleanup function to handle queue as well
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  -- Remove sessions older than 30 minutes
  DELETE FROM player_sessions 
  WHERE session_start < NOW() - INTERVAL '30 minutes';
  
  -- Remove sessions with no activity for 5 minutes
  DELETE FROM player_sessions 
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
  
  -- Remove queue entries older than 10 minutes (abandoned)
  DELETE FROM player_queue 
  WHERE joined_at < NOW() - INTERVAL '10 minutes';
  
  -- Reorder queue positions after cleanup
  WITH ordered_queue AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY joined_at) as new_position
    FROM player_queue
  )
  UPDATE player_queue 
  SET queue_position = ordered_queue.new_position
  FROM ordered_queue 
  WHERE player_queue.id = ordered_queue.id;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

-- Enable realtime for queue table
ALTER PUBLICATION supabase_realtime ADD TABLE player_queue;