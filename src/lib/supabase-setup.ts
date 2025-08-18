import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database setup functions
export const setupDatabase = async () => {
  try {
    // Create player_sessions table
    const { error: tableError } = await supabase.rpc('create_player_sessions_table');
    if (tableError && !tableError.message.includes('already exists')) {
      console.error('Error creating player_sessions table:', tableError);
    }
  } catch (error) {
    console.error('Database setup error:', error);
  }
};

// SQL for creating the table (to be run manually in Supabase if needed)
export const CREATE_PLAYER_SESSIONS_TABLE = `
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

-- Enable RLS
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can insert player sessions" ON player_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update their own session" ON player_sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can view active sessions" ON player_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can delete their own session" ON player_sessions FOR DELETE USING (true);

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
`;