"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/lib/api";
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Target,
} from "lucide-react";

interface UserStats {
  userId: string;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  highPriorityTasks: number;
  overdueTasks: number;
}

export default function StatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await api.get(`/tasks/stats/user/${user?.id}`);
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading statistics...</div>
      </div>
    );
  }

  const completionRate = stats?.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          My Performance Dashboard
        </h1>
        <p className="text-gray-500 mt-2">
          Welcome back, {user?.firstName}! Here's your task performance
          overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Tasks */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.totalTasks || 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Target className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats?.completedTasks || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {completionRate}% completion rate
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats?.inProgressTasks || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* TODO */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">To Do</p>
              <p className="text-3xl font-bold text-gray-600 mt-2">
                {stats?.todoTasks || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* High Priority */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {stats?.highPriorityTasks || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {stats?.overdueTasks || 0}
              </p>
              {stats && stats.overdueTasks > 0 && (
                <p className="text-xs text-red-500 mt-1">Needs attention!</p>
              )}
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Task Completion Progress
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>

          {stats && stats.totalTasks > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-600">
                  {stats.todoTasks}
                </p>
                <p className="text-xs text-gray-500">TODO</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.inProgressTasks}
                </p>
                <p className="text-xs text-gray-500">IN PROGRESS</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completedTasks}
                </p>
                <p className="text-xs text-gray-500">DONE</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
