-- Add public_title override to hall_of_fame entries (nullable — null means use auto-generated title)
ALTER TABLE hall_of_fame ADD COLUMN public_title TEXT;
