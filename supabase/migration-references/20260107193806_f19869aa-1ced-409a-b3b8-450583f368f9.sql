-- Add 'pending' to user_status enum
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending';