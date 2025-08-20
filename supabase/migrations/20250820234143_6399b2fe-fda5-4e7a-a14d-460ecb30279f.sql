-- Add emoji field to player_sessions table
ALTER TABLE public.player_sessions 
ADD COLUMN selected_emoji text DEFAULT '😀';

-- Add collision count and hit state for collision detection
ALTER TABLE public.player_sessions 
ADD COLUMN collision_count integer DEFAULT 0,
ADD COLUMN is_hit boolean DEFAULT false,
ADD COLUMN hit_timestamp timestamp with time zone DEFAULT NULL;