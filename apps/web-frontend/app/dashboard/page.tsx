"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/lib/api";
import Link from "next/link";
import {
  Users,
  CheckSquare,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";

interface Stats {
  userId: string;
  total: number;
  byStatus: {
    TODO: number;
    IN_PROGRESS: number;
    DONE: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch user's task stats
        const statsResponse = await api.get(`/tasks/stats/user/${user.id}`);
        setStats(statsResponse.data);

        // Fetch users count (for ADMIN/TEAM_LEAD)
        if (user.role === "ADMIN" || user.role === "TEAM_LEAD") {
          const usersResponse = await api.get("/users");
          setUsersCount(usersResponse.data.length);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const openTasks = stats
    ? stats.byStatus.TODO + stats.byStatus.IN_PROGRESS
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome, {user?.firstName || "User"}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your work today
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Tasks */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    My Tasks
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-900">
                    {stats?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/dashboard/tasks"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                View all tasks
              </Link>
            </div>
          </div>
        </div>

        {/* Open Tasks */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Open Tasks
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-900">
                    {openTasks}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/dashboard/tasks"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                View open tasks
              </Link>
            </div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-900">
                    {stats?.byStatus.DONE || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/dashboard/stats"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                View statistics
              </Link>
            </div>
          </div>
        </div>

        {/* Users Count (ADMIN/TEAM_LEAD only) */}
        {(user?.role === "ADMIN" || user?.role === "TEAM_LEAD") && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Team Members
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {usersCount}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link
                  href="/dashboard/users"
                  className="font-medium text-indigo-600 hover:text-indigo-900"
                >
                  Manage users
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Chat Link */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Messages
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-900">Chat</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/dashboard/chat"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                Open chat
              </Link>
            </div>
          </div>
        </div>

        {/* Team Stats (ADMIN/TEAM_LEAD only) */}
        {(user?.role === "ADMIN" || user?.role === "TEAM_LEAD") && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Team Stats
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      Analytics
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link
                  href="/dashboard/team-stats"
                  className="font-medium text-indigo-600 hover:text-indigo-900"
                >
                  View team stats
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
