"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { Users, CheckCircle, Clock, ListTodo, TrendingUp } from "lucide-react";

interface OverviewStats {
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

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface UserStats {
  userId: string;
  userName: string;
  total: number;
  byStatus: {
    TODO: number;
    IN_PROGRESS: number;
    DONE: number;
  };
}

export default function TeamStatsPage() {
  const { user } = useAuth();
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(
    null
  );
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  const canViewTeamStats = user?.role === "ADMIN" || user?.role === "TEAM_LEAD";

  const fetchData = async () => {
    if (!canViewTeamStats) return;

    try {
      // Fetch overview stats
      const statsResponse = await api.get("/tasks/stats/overview");
      setOverviewStats(statsResponse.data);

      // Fetch all users
      const usersResponse = await api.get("/users");
      setUsers(usersResponse.data);

      // Fetch stats for each user
      const statsPromises = usersResponse.data.map(async (u: User) => {
        try {
          const res = await api.get(`/tasks/stats/user/${u.id}`);
          return {
            ...res.data,
            userName: `${u.firstName} ${u.lastName}`,
          };
        } catch (err) {
          return {
            userId: u.id,
            userName: `${u.firstName} ${u.lastName}`,
            total: 0,
            byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      setUserStats(stats);
    } catch (err) {
      console.error("Failed to fetch team stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (!canViewTeamStats) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">
          Only ADMIN or TEAM_LEAD can view team statistics
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const completionRate = overviewStats
    ? overviewStats.total > 0
      ? Math.round((overviewStats.byStatus.DONE / overviewStats.total) * 100)
      : 0
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Users className="mr-2 h-6 w-6" />
          Team Statistics
        </h1>
        <p className="text-gray-600 mt-1">
          Overview of all tasks and team performance
        </p>
      </div>

      {/* Overall Summary */}
      {overviewStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Tasks
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {overviewStats.total}
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
                    {overviewStats.byStatus.TODO}
                  </p>
                </div>
                <Clock className="h-12 w-12 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    In Progress
                  </p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {overviewStats.byStatus.IN_PROGRESS}
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
                    {overviewStats.byStatus.DONE}
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Team Completion Rate
              </h3>
              <span className="text-3xl font-bold text-green-600">
                {completionRate}%
              </span>
            </div>
          </div>
        </>
      )}

      {/* Individual User Stats */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Tasks by Team Member
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To Do
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userStats.map((stat) => {
                const userCompletionRate =
                  stat.total > 0
                    ? Math.round((stat.byStatus.DONE / stat.total) * 100)
                    : 0;

                return (
                  <tr key={stat.userId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {stat.userName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{stat.total}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {stat.byStatus.TODO}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-600">
                        {stat.byStatus.IN_PROGRESS}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-green-600">
                        {stat.byStatus.DONE}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${userCompletionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {userCompletionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
