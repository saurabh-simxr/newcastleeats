"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Users, Truck, Store,
  BarChart3, Settings, X, UtensilsCrossed, MapPin,
  Home, ShoppingCart, User, ChefHat, Star, CreditCard,
  ShieldCheck, History as HistoryIcon, LineChart, MessageSquare, MessageCircle
} from "lucide-react";

import type { SessionUser, UserRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: React.ElementType };

const navByRole: Record<UserRole, NavItem[]> = {
  owner: [
    { label: "Overview",        href: "/dashboard/owner",                icon: LayoutDashboard },
    { label: "Live Orders",     href: "/dashboard/owner/orders",         icon: UtensilsCrossed },
    { label: "Order History",   href: "/dashboard/owner/history",        icon: HistoryIcon },
    { label: "Reports",         href: "/dashboard/owner/reports",        icon: BarChart3 },
    { label: "Restaurants",     href: "/dashboard/owner/restaurants",    icon: Store },
    { label: "Settings",        href: "/dashboard/owner/settings",       icon: Settings },
    { label: "Support",         href: "/dashboard/owner/support",        icon: MessageSquare },
  ],
  admin: [
    { label: "Overview",    href: "/dashboard/admin",              icon: LayoutDashboard },
    { label: "Users",       href: "/dashboard/admin/users",        icon: Users },
    { label: "Drivers",     href: "/dashboard/admin/drivers",      icon: Truck },
    { label: "Restaurants", href: "/dashboard/admin/restaurants",  icon: UtensilsCrossed },
    { label: "Deletions",   href: "/dashboard/admin/deletions",    icon: ShieldCheck },
    { label: "Menu",        href: "/dashboard/admin/menu",         icon: ChefHat },
    { label: "Featured",    href: "/dashboard/admin/featured",     icon: Star },
    { label: "Moderation",  href: "/dashboard/admin/reviews",      icon: ShieldCheck },
    { label: "Orders",      href: "/dashboard/admin/orders",       icon: ShoppingBag },
    { label: "Payments",    href: "/dashboard/admin/payments",     icon: CreditCard },
    { label: "Analytics",   href: "/dashboard/admin/analytics",    icon: LineChart },
    { label: "Support",     href: "/dashboard/admin/support",      icon: MessageSquare },
    { label: "WhatsApp Templates", href: "/dashboard/admin/whatsapp-templates", icon: MessageCircle },
    { label: "Settings",    href: "/dashboard/admin/settings",     icon: Settings },
  ],
  driver: [
    { label: "Overview",        href: "/dashboard/driver",               icon: LayoutDashboard },
    { label: "Deliveries",      href: "/dashboard/driver/deliveries",    icon: MapPin },
    { label: "Earnings",        href: "/dashboard/driver/earnings",      icon: BarChart3 },
    { label: "Settings",        href: "/dashboard/driver/settings",      icon: Settings },
  ],
  customer: [
    { label: "Home",            href: "/dashboard/customer",             icon: Home },
    { label: "My Orders",       href: "/dashboard/customer/orders",      icon: ShoppingBag },
    { label: "Cart",            href: "/dashboard/customer/cart",        icon: ShoppingCart },
    { label: "Profile",         href: "/dashboard/customer/profile",     icon: User },
    { label: "Settings",        href: "/dashboard/customer/settings",    icon: Settings },
  ],
};

export default function DashboardSidebar({
  user,
  open,
  onClose,
}: {
  user: SessionUser;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const nav = navByRole[user.role];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 ease-in-out",
        "lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
      style={{ background: "var(--dash-sidebar-bg)", borderRight: "1px solid var(--dash-sidebar-border)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 shrink-0" style={{ borderBottom: "1px solid var(--dash-sidebar-border)" }}>
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--dash-accent)" }}>
            E
          </span>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Eats Platform</p>
            <p className="text-xs capitalize" style={{ color: "var(--dash-sidebar-text)" }}>{user.role}</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded" style={{ color: "var(--dash-sidebar-text)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== `/dashboard/${user.role}` && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                color:      active ? "var(--dash-sidebar-active)" : "var(--dash-sidebar-text)",
                background: active ? "var(--dash-sidebar-hover)" : "transparent",
              }}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: active ? "var(--dash-accent)" : "var(--dash-sidebar-text)" }}
              />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--dash-accent)" }} />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 shrink-0" style={{ borderTop: "1px solid var(--dash-sidebar-border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "var(--dash-accent)" }}
          >
            {user.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs truncate" style={{ color: "var(--dash-sidebar-text)" }}>{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
