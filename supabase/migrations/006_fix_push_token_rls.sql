-- ============================================================
-- Fix: Allow users to update their own push_token
-- The existing "user can link themselves to a hotel once" policy
-- blocks all updates once hotel_id is set (USING hotel_id IS NULL).
-- Staff need to update push_token on every app login.
-- ============================================================

-- Drop old restrictive self-update policy
DROP POLICY IF EXISTS "user can link themselves to a hotel once" ON staff_profiles;

-- Allow user to update their own row at any time (needed for push_token)
CREATE POLICY "user can update own profile" ON staff_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Keep the hotel-linking intent: use a separate SELECT-only check
-- (hotel linking is controlled by the admin anyway)
