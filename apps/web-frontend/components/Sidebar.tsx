"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Users,
  Bell,
  Settings,
  Upload,
} from "lucide-react";
import clsx from "clsx";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdminOrLead = user?.role === "ADMIN" || user?.role === "TEAM_LEAD";

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ];

  if (isAdminOrLead) {
    navItems.push({ name: "Users", href: "/dashboard/users", icon: Users });
    navItems.push({ name: "Import", href: "/dashboard/import", icon: Upload });
  }

  // Always add settings at the end
  navItems.push({
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  });

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
                <Icon
                  className="mr-3 flex-shrink-0 h-6 w-6"
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user?.email}</p>
            <p className="text-xs font-medium text-gray-400">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
