DELETE FROM player_sessions 
WHERE session_start < NOW() - INTERVAL '60 minutes'
   OR last_activity < NOW() - INTERVAL '5 minutes'