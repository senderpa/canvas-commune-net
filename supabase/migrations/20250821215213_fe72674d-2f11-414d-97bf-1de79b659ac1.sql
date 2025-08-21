-- Enable pgcrypto extension for secure random generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update generate_secure_session_token function with fallback
CREATE OR REPLACE FUNCTION public.generate_secure_session_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try to use gen_random_bytes first, fallback to gen_random_uuid if not available
  BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
  EXCEPTION WHEN undefined_function THEN
    -- Fallback: Use multiple UUIDs for entropy
    RETURN replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  END;
END;
$$;