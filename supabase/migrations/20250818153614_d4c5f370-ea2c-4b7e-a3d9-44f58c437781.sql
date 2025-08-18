-- Fix function search path security issue
ALTER FUNCTION cleanup_inactive_sessions() SET search_path = 'public';