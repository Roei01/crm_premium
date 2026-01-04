"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import {
  CheckCircle,
  Clock,
  ListTodo,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface Stats {
  userId: string;
  total: number;
  byStatus: {
    TODO: number;
    IN_PROGRESS: number;
    DONE: number;
  };
  byPriority: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export default function StatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const response = await api.get(`/tasks/stats/user/${user.id}`);
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">No statistics available</p>
      </div>
    );
  }

  const completionRate =
    stats.total > 0 ? Math.round((stats.byStatus.DONE / stats.total) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          My Task Statistics
        </h1>
        <p className="text-gray-600 mt-1">
          Overview of your tasks and performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.total}
              </p>
            </div>
            <ListTodo className="h-12 w-12 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">To Do</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.byStatus.TODO}
              </p>
            </div>
            <Clock className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.byStatus.IN_PROGRESS}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.byStatus.DONE}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Status Breakdown
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">To Do</span>
                <span className="font-medium">{stats.byStatus.TODO}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-400 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.total > 0
                        ? (stats.byStatus.TODO / stats.total) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">In Progress</span>
                <span className="font-medium">
                  {stats.byStatus.IN_PROGRESS}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.total > 0
                        ? (stats.byStatus.IN_PROGRESS / stats.total) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium">{stats.byStatus.DONE}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.total > 0
                        ? (stats.byStatus.DONE / stats.total) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Completion Rate
              </span>
              <span className="text-2xl font-bold text-green-600">
                {completionRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Priority Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
                <span className="font-medium text-gray-900">High Priority</span>
              </div>
              <span className="text-2xl font-bold text-red-600">
                {stats.byPriority.HIGH}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-yellow-600 mr-3" />
                <span className="font-medium text-gray-900">
                  Medium Priority
                </span>
              </div>
              <span className="text-2xl font-bold text-yellow-600">
                {stats.byPriority.MEDIUM}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-green-600 mr-3" />
                <span className="font-medium text-gray-900">Low Priority</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {stats.byPriority.LOW}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
