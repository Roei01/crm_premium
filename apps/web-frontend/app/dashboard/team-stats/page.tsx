"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/lib/api";
import { Users, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";

interface EmployeeStats {
  _id: string;
  assigneeName: string;
  totalTasks: number;
  completedTasks: number;
}

export default function TeamStatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "TEAM_LEAD") {
      fetchTeamStats();
    }
  }, [user]);

  const fetchTeamStats = async () => {
    try {
      const response = await api.get("/tasks/stats/overview");
      setStats(response.data.stats || []);
    } catch (err) {
      console.error("Failed to fetch team stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== "ADMIN" && user.role !== "TEAM_LEAD")) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            You don't have permission to view this page. Only Team Leads and
            Admins can access team statistics.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading team statistics...</div>
      </div>
    );
  }

  const calculateCompletionRate = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const totalTeamTasks = stats.reduce((sum, emp) => sum + emp.totalTasks, 0);
  const totalTeamCompleted = stats.reduce(
    (sum, emp) => sum + emp.completedTasks,
    0
  );
  const overallCompletionRate = calculateCompletionRate(
    totalTeamCompleted,
    totalTeamTasks
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Performance</h1>
        <p className="text-gray-500 mt-2">
          Overview of all team members' task performance
        </p>
      </div>

      {/* Overall Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">
                Team Members
              </p>
              <p className="text-4xl font-bold mt-2">{stats.length}</p>
            </div>
            <Users className="h-12 w-12 text-indigo-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Tasks</p>
              <p className="text-4xl font-bold mt-2">{totalTeamTasks}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completed</p>
              <p className="text-4xl font-bold mt-2">{totalTeamCompleted}</p>
              <p className="text-green-100 text-xs mt-1">
                {overallCompletionRate}% completion rate
              </p>
            </div>
            <CheckCircle2 className="h-12 w-12 text-green-200" />
          </div>
        </div>
      </div>

      {/* Individual Employee Stats */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Individual Performance
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No task data available yet
                  </td>
                </tr>
              ) : (
                stats.map((employee) => {
                  const completionRate = calculateCompletionRate(
                    employee.completedTasks,
                    employee.totalTasks
                  );
                  const inProgress =
                    employee.totalTasks - employee.completedTasks;

                  return (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.assigneeName || "Unassigned"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {employee.totalTasks}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600 font-medium">
                          {employee.completedTasks}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-blue-600">
                          {inProgress}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                completionRate >= 75
                                  ? "bg-green-500"
                                  : completionRate >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">
                            {completionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {completionRate >= 75 ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Excellent
                          </span>
                        ) : completionRate >= 50 ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Good
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Needs Attention
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
