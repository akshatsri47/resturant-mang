-- ============================================================
-- HOTEL MANAGEMENT SYSTEM
-- Seed Data for Testing Roles
-- Run this in your Supabase SQL Editor
-- ============================================================

-- This script creates 3 test users with different roles:
-- 1. admin@test.com (Role: admin)
-- 2. reception@test.com (Role: reception)
-- 3. staff@test.com (Role: staff)
-- Password for all users is: password123

DO $$
DECLARE
  v_hotel_id UUID;
  v_admin_id UUID := gen_random_uuid();
  v_reception_id UUID := gen_random_uuid();
  v_staff_id UUID := gen_random_uuid();
BEGIN
  -- 1. Create a dummy hotel for our test users
  INSERT INTO public.hotels (id, name, address, tax_rate, max_requests_per_hour)
  VALUES (
    gen_random_uuid(), 
    'Grand Lumiere Hotel', 
    '123 Ocean Drive, Miami FL', 
    10.00, 
    50
  ) RETURNING id INTO v_hotel_id;

  -- 2. Insert into auth.users (This bypasses the UI and creates the users directly)
  -- The trigger 'on_auth_user_created' will automatically create the 'staff_profiles' for these users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES
    -- Admin User
    (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated', 'admin@test.com', crypt('password123', gen_salt('bf')),
      NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role": "admin", "full_name": "Test Admin"}', NOW(), NOW(), '', '', '', ''
    ),
    -- Reception User
    (
      '00000000-0000-0000-0000-000000000000', v_reception_id, 'authenticated', 'authenticated', 'reception@test.com', crypt('password123', gen_salt('bf')),
      NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role": "reception", "full_name": "Test Receptionist"}', NOW(), NOW(), '', '', '', ''
    ),
    -- Staff User
    (
      '00000000-0000-0000-0000-000000000000', v_staff_id, 'authenticated', 'authenticated', 'staff@test.com', crypt('password123', gen_salt('bf')),
      NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role": "staff", "full_name": "Test Floor Staff"}', NOW(), NOW(), '', '', '', ''
    );

  -- 3. The trigger created the profiles, but hotel_id is NULL by default. 
  -- We need to update the newly created staff_profiles to link them to our test hotel.
  UPDATE public.staff_profiles 
  SET hotel_id = v_hotel_id
  WHERE id IN (v_admin_id, v_reception_id, v_staff_id);

END $$;
