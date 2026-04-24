-- ============================================================
-- Fix: Ensure unauthenticated (anon) guests can submit requests
-- via the QR code guest portal.
-- Run this in your Supabase SQL Editor if you get 403 on /requests
-- ============================================================

-- Drop existing anon policies first (safe – they are recreated below)
DROP POLICY IF EXISTS "anon can create requests" ON requests;
DROP POLICY IF EXISTS "anon can view own requests by session" ON requests;
DROP POLICY IF EXISTS "anyone can lookup room by qr_token" ON rooms;
DROP POLICY IF EXISTS "anon can view menu categories" ON menu_categories;
DROP POLICY IF EXISTS "anon can view menu items" ON menu_items;

-- Allow any anonymous visitor to INSERT a request (for guest QR portal)
CREATE POLICY "anon can create requests" ON requests
  FOR INSERT TO anon
  WITH CHECK (TRUE);

-- Allow authenticated users to also INSERT requests.
-- This covers: staff testing the guest page while logged in,
-- or a browser where a staff session is still active.
DROP POLICY IF EXISTS "authenticated can create requests" ON requests;
CREATE POLICY "authenticated can create requests" ON requests
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- Allow anonymous visitors to SELECT requests (optional – keeps it simple)
CREATE POLICY "anon can view own requests by session" ON requests
  FOR SELECT TO anon
  USING (TRUE);

-- Allow anonymous visitors to look up a room by its QR token
CREATE POLICY "anyone can lookup room by qr_token" ON rooms
  FOR SELECT TO anon
  USING (is_active = TRUE);

-- Allow anonymous visitors to browse menu categories
CREATE POLICY "anon can view menu categories" ON menu_categories
  FOR SELECT TO anon
  USING (is_active = TRUE);

-- Allow anonymous visitors to browse available menu items
CREATE POLICY "anon can view menu items" ON menu_items
  FOR SELECT TO anon
  USING (is_available = TRUE);
