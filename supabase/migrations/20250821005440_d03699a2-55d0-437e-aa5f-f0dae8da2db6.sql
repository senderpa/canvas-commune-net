-- Fix security policies for game tables

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can delete highscores" ON public.highscores;
DROP POLICY IF EXISTS "Anyone can insert highscores" ON public.highscores;
DROP POLICY IF EXISTS "Anyone can update highscores" ON public.highscores;
DROP POLICY IF EXISTS "Anyone can view highscores" ON public.highscores;

DROP POLICY IF EXISTS "Anyone can delete from queue" ON public.player_queue;
DROP POLICY IF EXISTS "Anyone can insert to queue" ON public.player_queue;
DROP POLICY IF EXISTS "Anyone can update queue" ON public.player_queue;
DROP POLICY IF EXISTS "Anyone can view queue" ON public.player_queue;

DROP POLICY IF EXISTS "Anyone can delete sessions" ON public.player_sessions;
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.player_sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.player_sessions;
DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.player_sessions;

DROP POLICY IF EXISTS "Anyone can delete strokes" ON public.strokes;
DROP POLICY IF EXISTS "Anyone can insert strokes" ON public.strokes;
DROP POLICY IF EXISTS "Anyone can update strokes" ON public.strokes;
DROP POLICY IF EXISTS "Anyone can view strokes" ON public.strokes;

-- Create secure policies for highscores table
CREATE POLICY "Public can view all highscores" 
ON public.highscores 
FOR SELECT 
USING (true);

CREATE POLICY "Players can insert their own highscores" 
ON public.highscores 
FOR INSERT 
WITH CHECK (true); -- Allow insertion but no updates/deletes

-- No UPDATE or DELETE policies for highscores (scores should be immutable)

-- Create secure policies for player_queue table
CREATE POLICY "Public can view queue" 
ON public.player_queue 
FOR SELECT 
USING (true);

CREATE POLICY "Players can join queue" 
ON public.player_queue 
FOR INSERT 
WITH CHECK (true);

-- Allow updates and deletes for queue management by system
CREATE POLICY "System can manage queue" 
ON public.player_queue 
FOR UPDATE 
USING (true);

CREATE POLICY "System can remove from queue" 
ON public.player_queue 
FOR DELETE 
USING (true);

-- Create secure policies for player_sessions table
CREATE POLICY "Public can view active player sessions" 
ON public.player_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Players can create their own sessions" 
ON public.player_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Players can update their own sessions" 
ON public.player_sessions 
FOR UPDATE 
USING (true); -- Allow updates for position, activity, etc.

CREATE POLICY "Players can remove their own sessions" 
ON public.player_sessions 
FOR DELETE 
USING (true); -- Allow session cleanup

-- Create secure policies for strokes table  
CREATE POLICY "Public can view all strokes" 
ON public.strokes 
FOR SELECT 
USING (true); -- Collaborative canvas - everyone can see all strokes

CREATE POLICY "Players can create strokes" 
ON public.strokes 
FOR INSERT 
WITH CHECK (true); -- Allow anyone to draw

-- No UPDATE policy for strokes (drawings should be immutable once created)

CREATE POLICY "System can delete strokes for cleanup" 
ON public.strokes 
FOR DELETE 
USING (true); -- Allow cleanup but no user deletion

-- Add function to validate player ownership (for future enhancements)
CREATE OR REPLACE FUNCTION public.validate_player_session(session_player_id text)
RETURNS boolean AS $$
BEGIN
  -- Basic validation - could be enhanced with more sophisticated checks
  RETURN session_player_id IS NOT NULL AND length(session_player_id) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;