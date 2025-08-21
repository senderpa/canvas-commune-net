-- Fix player_queue security vulnerabilities
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can manage queue" ON public.player_queue;

-- Create restrictive policies that block direct table access
CREATE POLICY "Block all direct queue access" 
ON public.player_queue 
FOR ALL 
USING (false);

-- Create secure function to join the queue
CREATE OR REPLACE FUNCTION public.join_player_queue(
  p_player_id text,
  p_session_token text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_position INTEGER;
BEGIN
  -- Validate inputs
  IF p_player_id IS NULL OR length(p_player_id) = 0 THEN
    RAISE EXCEPTION 'Invalid player ID';
  END IF;
  
  -- Remove any existing queue entry for this player first
  DELETE FROM player_queue WHERE player_id = p_player_id;
  
  -- Get the next queue position
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO new_position
  FROM player_queue;
  
  -- Insert into queue
  INSERT INTO player_queue (
    player_id,
    session_token,
    queue_position,
    joined_at
  ) VALUES (
    p_player_id,
    p_session_token,
    new_position,
    now()
  );
  
  RETURN new_position;
END;
$$;

-- Create secure function to leave the queue
CREATE OR REPLACE FUNCTION public.leave_player_queue(
  p_player_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_position INTEGER;
BEGIN
  -- Remove player from queue and get their position
  DELETE FROM player_queue 
  WHERE player_id = p_player_id
  RETURNING queue_position INTO deleted_position;
  
  -- If player was found and removed
  IF deleted_position IS NOT NULL THEN
    -- Reorder remaining queue positions to fill the gap
    UPDATE player_queue 
    SET queue_position = queue_position - 1
    WHERE queue_position > deleted_position;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create secure function to get queue status for a specific player
CREATE OR REPLACE FUNCTION public.get_queue_status(
  p_player_id text
) RETURNS TABLE(
  position integer,
  total_count integer,
  estimated_wait_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pq.queue_position as position,
    (SELECT COUNT(*)::integer FROM player_queue) as total_count,
    -- Estimate 2 minutes per position ahead
    GREATEST(1, (pq.queue_position * 2))::integer as estimated_wait_minutes
  FROM player_queue pq
  WHERE pq.player_id = p_player_id;
END;
$$;

-- Update the promote_from_queue function to be more secure
CREATE OR REPLACE FUNCTION public.promote_from_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_count INTEGER;
  next_in_queue RECORD;
  max_players CONSTANT INTEGER := 100;
BEGIN
  -- Get current active players count
  SELECT COUNT(*) INTO active_count 
  FROM player_sessions 
  WHERE is_active = true 
    AND last_activity > NOW() - INTERVAL '5 minutes';
  
  -- If there's room and people in queue, promote them
  WHILE active_count < max_players LOOP
    -- Get the next person in queue (lowest position)
    SELECT * INTO next_in_queue 
    FROM player_queue 
    ORDER BY queue_position ASC 
    LIMIT 1;
    
    -- If no one in queue, exit
    IF NOT FOUND THEN
      EXIT;
    END IF;
    
    -- Try to create a session for them
    BEGIN
      -- Generate session data
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
        next_in_queue.player_id,
        next_in_queue.session_token,
        generate_anonymous_id(),
        true,
        floor(random() * (10000 - 512)),
        floor(random() * (10000 - 512)),
        '#ff0080',
        'brush',
        5,
        now(),
        now()
      );
      
      -- Remove from queue
      DELETE FROM player_queue WHERE id = next_in_queue.id;
      
      -- Update count for next iteration
      active_count := active_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- If session creation fails, remove from queue anyway
      DELETE FROM player_queue WHERE id = next_in_queue.id;
    END;
  END LOOP;
  
  -- Reorder remaining queue positions to be sequential
  WITH ordered_queue AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY joined_at) as new_position
    FROM player_queue
  )
  UPDATE player_queue 
  SET queue_position = ordered_queue.new_position
  FROM ordered_queue 
  WHERE player_queue.id = ordered_queue.id;
END;
$$;

-- Grant execute permissions on the new secure functions
GRANT EXECUTE ON FUNCTION public.join_player_queue(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.leave_player_queue(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_queue_status(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.promote_from_queue() TO authenticated, anon;