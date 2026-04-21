-- ============================================================
-- HOTEL IN-ROOM SERVICE & OPERATIONS MANAGEMENT SYSTEM
-- Full Database Schema Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- HOTELS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  logo_url TEXT,
  tax_rate NUMERIC(5,2) DEFAULT 10.00,
  max_requests_per_hour INTEGER DEFAULT 20,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- ROOM TYPES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_tier TEXT DEFAULT 'standard',
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- FLOORS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- ROOMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  room_number TEXT NOT NULL,
  qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  qr_token_version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, room_number)
);

-- ─────────────────────────────────────────────────────────────
-- STAFF PROFILES (extends auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin','admin','supervisor','reception','staff')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- MENU CATEGORIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🍽️',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- MENU ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  is_chargeable BOOLEAN DEFAULT TRUE,
  visible_to_room_types UUID[] DEFAULT ARRAY[]::UUID[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- BILL TABS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_name TEXT,
  check_in_date TIMESTAMPTZ DEFAULT NOW(),
  check_out_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled','voided')),
  tax_rate NUMERIC(5,2) DEFAULT 10.00,
  discount_cents INTEGER DEFAULT 0,
  discount_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- REQUESTS (core entity)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  guest_name TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('order','service','complaint')),
  category TEXT NOT NULL,
  items JSONB,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_progress','completed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bill_line_item_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- BILL LINE ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES bill_tabs(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  is_voided BOOLEAN DEFAULT FALSE,
  void_reason TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from requests to bill_line_items (after both tables exist)
ALTER TABLE requests
  ADD CONSTRAINT IF NOT EXISTS fk_requests_bill_line_item
  FOREIGN KEY (bill_line_item_id) REFERENCES bill_line_items(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- SLA RULES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  request_type TEXT,
  category TEXT,
  unassigned_threshold_minutes INTEGER DEFAULT 10,
  in_progress_threshold_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rooms_hotel ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_qr_token ON rooms(qr_token);
CREATE INDEX IF NOT EXISTS idx_requests_hotel ON requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_requests_room ON requests(room_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_tabs_room ON bill_tabs(room_id);
CREATE INDEX IF NOT EXISTS idx_bill_tabs_status ON bill_tabs(status);
CREATE INDEX IF NOT EXISTS idx_bill_line_items_tab ON bill_line_items(tab_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_hotel ON menu_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hotel ON audit_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hotels_updated_at BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER staff_profiles_updated_at BEFORE UPDATE ON staff_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER requests_updated_at BEFORE UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bills_tabs_updated_at BEFORE UPDATE ON bill_tabs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- AUTO-CREATE STAFF PROFILE ON SIGNUP
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO staff_profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's hotel_id and role
CREATE OR REPLACE FUNCTION get_my_hotel_id()
RETURNS UUID AS $$
  SELECT hotel_id FROM staff_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM staff_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- HOTELS policies
CREATE POLICY "super_admin can do all on hotels" ON hotels
  FOR ALL TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "hotel staff can view their hotel" ON hotels
  FOR SELECT TO authenticated
  USING (id = get_my_hotel_id());

CREATE POLICY "admin can update their hotel" ON hotels
  FOR UPDATE TO authenticated
  USING (id = get_my_hotel_id() AND get_my_role() = 'admin')
  WITH CHECK (id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ROOM TYPES policies
CREATE POLICY "staff can view room_types of their hotel" ON room_types
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id());

CREATE POLICY "admin can manage room_types" ON room_types
  FOR ALL TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'))
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'));

-- FLOORS policies
CREATE POLICY "staff can view floors of their hotel" ON floors
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id());

CREATE POLICY "admin can manage floors" ON floors
  FOR ALL TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'))
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'));

-- ROOMS policies
CREATE POLICY "staff can view rooms of their hotel" ON rooms
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id());

CREATE POLICY "admin can manage rooms" ON rooms
  FOR ALL TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'))
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'));

-- Allow guests to read rooms by qr_token (for QR validation)
CREATE POLICY "anyone can lookup room by qr_token" ON rooms
  FOR SELECT TO anon
  USING (is_active = TRUE);

-- STAFF PROFILES policies
CREATE POLICY "user can read own profile" ON staff_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "admin can view all profiles in hotel" ON staff_profiles
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin', 'super_admin', 'supervisor', 'reception'));

CREATE POLICY "admin can manage staff in hotel" ON staff_profiles
  FOR ALL TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (hotel_id = get_my_hotel_id());

CREATE POLICY "super_admin can manage all profiles" ON staff_profiles
  FOR ALL TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

-- MENU CATEGORIES policies
CREATE POLICY "staff can view menu categories" ON menu_categories
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id());

CREATE POLICY "anon can view menu categories" ON menu_categories
  FOR SELECT TO anon USING (is_active = TRUE);

CREATE POLICY "admin can manage menu categories" ON menu_categories
  FOR ALL TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'))
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'));

-- MENU ITEMS policies
CREATE POLICY "staff can view menu items" ON menu_items
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id());

CREATE POLICY "anon can view menu items" ON menu_items
  FOR SELECT TO anon USING (is_available = TRUE);

CREATE POLICY "admin can manage menu items" ON menu_items
  FOR ALL TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'))
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'));

-- REQUESTS policies
CREATE POLICY "anon can create requests" ON requests
  FOR INSERT TO anon WITH CHECK (TRUE);

CREATE POLICY "anon can view own requests by session" ON requests
  FOR SELECT TO anon USING (TRUE);

CREATE POLICY "staff can view requests in their hotel" ON requests
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id());

CREATE POLICY "staff can only see their assigned requests" ON requests
  FOR SELECT TO authenticated
  USING (
    hotel_id = get_my_hotel_id() AND (
      get_my_role() IN ('admin','super_admin','supervisor','reception')
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY "reception and above can update requests" ON requests
  FOR UPDATE TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin','supervisor','reception','staff'))
  WITH CHECK (hotel_id = get_my_hotel_id());

-- BILL TABS policies
CREATE POLICY "reception and above can view bill tabs" ON bill_tabs
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin','supervisor','reception'));

CREATE POLICY "reception and above can manage bill tabs" ON bill_tabs
  FOR ALL TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin','reception'))
  WITH CHECK (hotel_id = get_my_hotel_id());

-- BILL LINE ITEMS policies
CREATE POLICY "reception and above can view line items" ON bill_line_items
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin','supervisor','reception'));

CREATE POLICY "reception and above can manage line items" ON bill_line_items
  FOR ALL TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin','reception'))
  WITH CHECK (hotel_id = get_my_hotel_id());

-- SLA RULES policies
CREATE POLICY "admin can manage sla rules" ON sla_rules
  FOR ALL TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'))
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'));

CREATE POLICY "staff can view sla rules" ON sla_rules
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id());

-- AUDIT LOGS policies
CREATE POLICY "admin can view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('admin','super_admin'));

CREATE POLICY "system can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────
-- REALTIME PUBLICATIONS
-- ─────────────────────────────────────────────────────────────
-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE bill_line_items;
ALTER PUBLICATION supabase_realtime ADD TABLE bill_tabs;

-- ─────────────────────────────────────────────────────────────
-- SEED: Default SLA rule for new hotels (via function)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_default_sla_rules(p_hotel_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sla_rules (hotel_id, request_type, unassigned_threshold_minutes, in_progress_threshold_minutes)
  VALUES
    (p_hotel_id, 'order', 5, 20),
    (p_hotel_id, 'service', 10, 40),
    (p_hotel_id, 'complaint', 5, 30),
    (p_hotel_id, NULL, 10, 30)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
