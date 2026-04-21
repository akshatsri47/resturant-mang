"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type Role } from "@/lib/types";
import {
  LayoutDashboard,
  UtensilsCrossed,
  BedDouble,
  Users,
  ClipboardList,
  CreditCard,
  Settings,
  Building2,
  Bell,
  ChevronRight,
  ShieldAlert,
  Hotel,
  Receipt,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  // Super Admin
  {
    label: "All Hotels",
    href: "/dashboard/super-admin",
    icon: Hotel,
    roles: ["super_admin"],
  },

  // Admin
  {
    label: "Overview",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Rooms & Floors",
    href: "/dashboard/admin/rooms",
    icon: BedDouble,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Menu & Services",
    href: "/dashboard/admin/menu",
    icon: UtensilsCrossed,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Staff",
    href: "/dashboard/admin/staff",
    icon: Users,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Billing Reports",
    href: "/dashboard/admin/billing",
    icon: Receipt,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Settings",
    href: "/dashboard/admin/settings",
    icon: Settings,
    roles: ["admin", "super_admin"],
  },

  // Reception
  {
    label: "Requests Queue",
    href: "/dashboard/reception",
    icon: ClipboardList,
    roles: ["reception"],
  },
  {
    label: "Room Bills",
    href: "/dashboard/reception/bills",
    icon: CreditCard,
    roles: ["reception"],
  },
  {
    label: "Checkout",
    href: "/dashboard/reception/checkout",
    icon: Receipt,
    roles: ["reception"],
  },

  // Supervisor
  {
    label: "Monitor",
    href: "/dashboard/supervisor",
    icon: ShieldAlert,
    roles: ["supervisor"],
  },

  // Staff
  {
    label: "My Tasks",
    href: "/dashboard/staff",
    icon: ClipboardList,
    roles: ["staff"],
  },
];

interface SidebarProps {
  role: Role;
  hotelName?: string;
  userName?: string;
}

export function Sidebar({ role, hotelName, userName }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  const roleLabels: Record<Role, string> = {
    super_admin: "Super Admin",
    admin: "Hotel Admin",
    supervisor: "Supervisor",
    reception: "Reception",
    staff: "Staff",
  };

  const roleColors: Record<Role, string> = {
    super_admin: "text-purple-400 bg-purple-400/15 border-purple-400/30",
    admin: "text-amber-400 bg-amber-400/15 border-amber-400/30",
    supervisor: "text-blue-400 bg-blue-400/15 border-blue-400/30",
    reception: "text-emerald-400 bg-emerald-400/15 border-emerald-400/30",
    staff: "text-slate-300 bg-slate-400/15 border-slate-400/30",
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-md">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground truncate">HotelOS</p>
          {hotelName && (
            <p className="text-xs text-muted-foreground truncate">{hotelName}</p>
          )}
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4">
        <span
          className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full border inline-block uppercase tracking-wider",
            roleColors[role]
          )}
        >
          {roleLabels[role]}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-link group",
                isActive && "active"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-3 w-3 opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">
              {userName ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground">
              {roleLabels[role]}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
