"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Users,
  Users2,
  Bell,
  Settings,
  Upload,
  BarChart3,
  PieChart,
  Calendar,
} from "lucide-react";
import clsx from "clsx";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isAdminOrLead = user?.role === "ADMIN" || user?.role === "TEAM_LEAD";

  // Poll unread notification count every 30 seconds
  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      try {
        const res = await api.get("/notifications/unread-count");
        setUnreadCount(res.data.unreadCount ?? 0);
      } catch {
        /* ignore */
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "My Stats", href: "/dashboard/stats", icon: BarChart3 },
    { name: "Customers", href: "/dashboard/customers", icon: Users2 },
    { name: "Meetings", href: "/dashboard/meetings", icon: Calendar },
    { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: unreadCount },
  ];

  if (isAdminOrLead) {
    navItems.push({ name: "Users", href: "/dashboard/users", icon: Users });
    navItems.push({ name: "Team Stats", href: "/dashboard/team-stats", icon: PieChart });
    navItems.push({ name: "Import", href: "/dashboard/import", icon: Upload });
  }

  navItems.push({ name: "Settings", href: "/dashboard/settings", icon: Settings });

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white min-h-screen">
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <span className="text-xl font-bold tracking-wider">CRM SaaS</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const badge = (item as any).badge as number | undefined;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
                <span className="flex-1">{item.name}</span>
                {badge && badge > 0 ? (
                  <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs font-medium text-gray-400">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
