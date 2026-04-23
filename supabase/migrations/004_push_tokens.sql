-- Add push_token column to staff_profiles for Expo Push Notifications
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
