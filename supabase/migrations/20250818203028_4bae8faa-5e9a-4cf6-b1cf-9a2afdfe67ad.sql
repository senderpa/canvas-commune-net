-- Create highscores table
CREATE TABLE public.highscores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emoji_id TEXT NOT NULL CHECK (length(emoji_id) >= 3),
  stroke_count INTEGER NOT NULL CHECK (stroke_count >= 999),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  player_id TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.highscores ENABLE ROW LEVEL SECURITY;

-- Create policies for highscores
CREATE POLICY "Anyone can view highscores" 
ON public.highscores 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert highscores" 
ON public.highscores 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update highscores" 
ON public.highscores 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete highscores" 
ON public.highscores 
FOR DELETE 
USING (true);

-- Add index for better performance on leaderboard queries
CREATE INDEX idx_highscores_stroke_count ON public.highscores (stroke_count DESC);

-- Insert the fake #1 entry
INSERT INTO public.highscores (emoji_id, stroke_count, player_id) 
VALUES ('🦹‍♀️🫀🏆', 3392, 'champion_player');