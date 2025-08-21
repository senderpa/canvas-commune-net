-- Fix Auth OTP expiry security issue
-- Reduce OTP expiry time to recommended security threshold (10 minutes)

UPDATE auth.config 
SET otp_expiry = 600 -- 10 minutes (600 seconds)
WHERE TRUE;