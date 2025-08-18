-- Create function to automatically promote queue members when spots open
CREATE OR REPLACE FUNCTION promote_from_queue()
RETURNS void AS $$
DECLARE
  active_count INTEGER;
  next_in_queue RECORD;
BEGIN
  -- Get current active players count
  SELECT COUNT(*) INTO active_count FROM player_sessions WHERE is_active = true;
  
  -- If there's room and people in queue, promote the first one
  WHILE active_count < 100 LOOP
    -- Get the next person in queue
    SELECT * INTO next_in_queue 
    FROM player_queue 
    ORDER BY queue_position ASC 
    LIMIT 1;
    
    -- If no one in queue, exit
    IF NOT FOUND THEN
      EXIT;
    END IF;
    
    -- Move them to active sessions
    INSERT INTO player_sessions (
      player_id,
      is_active,
      position_x,
      position_y,
      current_color,
      current_tool,
      current_size
    ) VALUES (
      next_in_queue.player_id,
      true,
      floor(random() * 10000),
      floor(random() * 10000),
      '#000000',
      'brush',
      5
    );
    
    -- Remove from queue
    DELETE FROM player_queue WHERE id = next_in_queue.id;
    
    -- Update count for next iteration
    active_count := active_count + 1;
  END LOOP;
  
  -- Reorder remaining queue positions
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

-- Update cleanup function to also promote from queue
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
  
  -- Promote people from queue to fill empty slots
  PERFORM promote_from_queue();
END;
$$ LANGUAGE plpgsql SET search_path = 'public';