// ============================================================
// CORE TYPES FOR HOTEL IN-ROOM SERVICE SYSTEM
// ============================================================

export type Role = 'super_admin' | 'admin' | 'supervisor' | 'reception' | 'staff';

export type RequestStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type RequestType = 'order' | 'service' | 'complaint';
export type Priority = 'low' | 'medium' | 'high';
export type BillTabStatus = 'open' | 'settled' | 'voided';

// ─── Hotel ────────────────────────────────────────────────
export interface Hotel {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  tax_rate: number;
  max_requests_per_hour: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Room Type ────────────────────────────────────────────
export interface RoomType {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  price_tier: string;
  created_at: string;
}

// ─── Floor ────────────────────────────────────────────────
export interface Floor {
  id: string;
  hotel_id: string;
  floor_number: number;
  name: string | null;
  created_at: string;
}

// ─── Room ─────────────────────────────────────────────────
export interface Room {
  id: string;
  hotel_id: string;
  floor_id: string | null;
  room_type_id: string;
  room_number: string;
  qr_token: string;
  qr_token_version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // joined
  room_type?: RoomType;
  floor?: Floor;
}

// ─── Staff Profile ────────────────────────────────────────
export interface StaffProfile {
  id: string;
  hotel_id: string | null;
  full_name: string | null;
  email?: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Menu Category ────────────────────────────────────────
export interface MenuCategory {
  id: string;
  hotel_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// ─── Menu Item ────────────────────────────────────────────
export interface MenuItem {
  id: string;
  hotel_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
  is_chargeable: boolean;
  visible_to_room_types: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  // joined
  category?: MenuCategory;
}

// ─── Order Item (in request) ──────────────────────────────
export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
}

// ─── Request ──────────────────────────────────────────────
export interface Request {
  id: string;
  hotel_id: string;
  room_id: string;
  room_number: string;
  room_type: string;
  guest_name: string | null;
  request_type: RequestType;
  category: string;
  items: OrderItem[] | null;
  description: string | null;
  status: RequestStatus;
  priority: Priority;
  assigned_to: string | null;
  bill_line_item_id: string | null;
  created_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  updated_at: string;
  // joined
  assigned_staff?: StaffProfile;
}

// ─── Bill Tab ─────────────────────────────────────────────
export interface BillTab {
  id: string;
  hotel_id: string;
  room_id: string;
  guest_name: string | null;
  check_in_date: string;
  check_out_date: string | null;
  status: BillTabStatus;
  tax_rate: number;
  discount_cents: number;
  discount_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined
  line_items?: BillLineItem[];
  room?: Room;
}

// ─── Bill Line Item ───────────────────────────────────────
export interface BillLineItem {
  id: string;
  tab_id: string;
  hotel_id: string;
  request_id: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  is_voided: boolean;
  void_reason: string | null;
  added_by: string | null;
  added_at: string;
}

// ─── SLA Rule ─────────────────────────────────────────────
export interface SlaRule {
  id: string;
  hotel_id: string;
  request_type: string | null;
  unassigned_threshold_minutes: number;
  in_progress_threshold_minutes: number;
  created_at: string;
}

// ─── Audit Log ────────────────────────────────────────────
export interface AuditLog {
  id: string;
  hotel_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

// ─── Dashboard Stats ──────────────────────────────────────
export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedToday: number;
  totalRevenue: number;
  openTabs: number;
  activeRooms: number;
  staffOnDuty: number;
}

// ─── QR Token Payload ────────────────────────────────────
export interface QrTokenPayload {
  roomId: string;
  hotelId: string;
  version: number;
}
