# Lumiere Hotel Operations - Current Features & Functionality

This document outlines all the major features and functionalities that have been fully built and are currently operational in the Lumiere Hotel In-Room Service & Operations Management System.

---

## 1. Authentication & Role-Based Access Control (RBAC)
The application utilizes Supabase Auth for a robust, secure authentication system tightly coupled with Row Level Security (RLS) policies.
- **Secure Login & Registration**: Support for email/password authentication, including forgot/update password flows.
- **Role-Based Routing**: Users are automatically redirected to their appropriate, secure dashboard based on their role (`super_admin`, `admin`, `supervisor`, `reception`, `staff`).
- **Database Row Level Security**: Granular RLS policies ensure that staff can only see data belonging to their assigned hotel, and only certain roles (like Admin) can perform destructive actions.

## 2. Guest Interface (No-App-Download Web App)
Guests access the system by scanning a QR code inside their room. The guest interface is optimized for mobile and requires no login.
- **Digital In-Room Dining**: 
  - Browse categorized food and beverage menus with descriptions and prices.
  - Cart system to compile orders.
  - One-tap ordering directly routed to the hotel staff/kitchen.
- **Service Requests**: Guests can instantly request room cleaning, extra towels, maintenance, or other amenities.
- **Complaint Logging**: Dedicated portal to raise issues.
- **Real-Time Status Tracking**: Guests can see live status updates of their requests (e.g., Pending, In Progress, Completed).

## 3. Admin Dashboard
A comprehensive management portal for Hotel Administrators and Managers to configure and oversee the entire operation.
- **Real-Time Overview**: High-level statistical dashboard tracking total rooms, active staff, pending guest requests, and currently open billing tabs.
- **Hotel Settings Management**: Configure core parameters such as hotel name, address, tax rates, and hourly request limits.
- **Rooms & QR Code Manager**:
  - Define architectural layout by creating Floors and Room Types (with pricing tiers and colors).
  - Manage individual Rooms.
  - **Dynamic QR Generation**: Automatically generate and print unique QR codes for each room which securely tie the guest session to that specific room.
- **Staff Manager**: Invite and manage employees, assign them specific roles, and control their access levels.
- **Digital Menu Manager**: 
  - Create and re-order menu categories.
  - Add menu items with pricing, imagery, and toggle their real-time availability/visibility.
- **Billing & Checkout Manager**: 
  - View all open bill tabs per room.
  - Review individual line items tied to room service orders.
  - Apply custom discounts and process final checkouts (settling bills).

## 4. Reception / Front Desk Dashboard
Designed for high-visibility monitoring and dispatching of tasks.
- **Live Request Queue**: A real-time, centralized board showing all incoming orders, service requests, and complaints from all rooms.
- **Task Dispatching**: Ability to assign incoming requests to specific available floor staff.
- **Status Management**: Manually override or update the status of any request (Pending -> Assigned -> In Progress -> Completed -> Cancelled).

## 5. Floor Staff Dashboard
A streamlined, mobile-friendly view for operational staff (housekeeping, room service runners, maintenance).
- **Personalized Task List**: Staff only see the active requests that have been explicitly assigned to them.
- **Actionable Workflow**: One-tap buttons to update the status of their assigned tasks to "In Progress" and "Completed", instantly updating the Reception and Guest views.

## 6. Landing Page
- A beautifully designed, responsive landing page featuring modern aesthetics, gradient animations, and clear feature breakdowns, serving as the entry point for hotel management to sign in to the platform.

---

### Technical Infrastructure Details
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons, Radix UI Primitives.
- **Backend & Database**: Supabase (PostgreSQL).
- **Real-Time**: Supabase Realtime subscriptions (WebSockets) for instant UI updates across Guest, Reception, and Staff screens.
