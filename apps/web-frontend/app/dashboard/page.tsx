"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/lib/api";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Bell,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface DashboardStats {
  totalUsers?: number;
  myTasks?: {
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  unreadNotifications?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch user stats
      if (user?.id) {
        const taskStats = await api.get(`/tasks/stats/user/${user.id}`);
        setStats((prev) => ({
          ...prev,
          myTasks: {
            total: taskStats.data.totalTasks,
            todo: taskStats.data.todoTasks,
            inProgress: taskStats.data.inProgressTasks,
            completed: taskStats.data.completedTasks,
            overdue: taskStats.data.overdueTasks,
          },
        }));
      }

      // Fetch unread notifications count
      const notifCount = await api.get("/notifications/unread-count");
      setStats((prev) => ({
        ...prev,
        unreadNotifications: notifCount.data.unreadCount,
      }));

      // If admin or team lead, fetch users count
      if (user?.role === "ADMIN" || user?.role === "TEAM_LEAD") {
        const usersResponse = await api.get("/users");
        setStats((prev) => ({
          ...prev,
          totalUsers: usersResponse.data.length,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="mt-2 text-indigo-100">
          Here's what's happening with your work today.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* My Tasks */}
        <Link href="/dashboard/tasks">
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      My Tasks
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {stats.myTasks?.total || 0}
                    </dd>
                    <dd className="text-xs text-gray-500">
                      {stats.myTasks?.completed || 0} completed
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Pending Tasks */}
        <Link href="/dashboard/tasks">
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      In Progress
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {stats.myTasks?.inProgress || 0}
                    </dd>
                    <dd className="text-xs text-gray-500">
                      {stats.myTasks?.todo || 0} waiting
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Notifications */}
        <Link href="/dashboard/notifications">
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Notifications
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {stats.unreadNotifications || 0}
                    </dd>
                    <dd className="text-xs text-gray-500">unread</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Overdue Tasks */}
        <Link href="/dashboard/tasks">
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Overdue
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {stats.myTasks?.overdue || 0}
                    </dd>
                    <dd className="text-xs text-gray-500">tasks</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Team Stats for Admins/Team Leads */}
      {(user?.role === "ADMIN" || user?.role === "TEAM_LEAD") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/dashboard/users">
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Users
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stats.totalUsers || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/team-stats">
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Team Performance
                      </dt>
                      <dd className="text-sm text-gray-600 mt-2">
                        View detailed stats
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
