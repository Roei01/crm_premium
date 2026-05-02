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
  Users2,
  ArrowRight,
  Building2,
  Mail,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  status: string;
  createdAt: string;
}

const TASK_CHART_DATA = (stats: TaskStats) => [
  { name: "To Do", value: stats.todo, fill: "#94a3b8" },
  { name: "In Progress", value: stats.inProgress, fill: "#6366f1" },
  { name: "Done", value: stats.completed, fill: "#10b981" },
];

const CUSTOMER_COLORS: Record<string, string> = {
  LEAD: "#6366f1",
  PROSPECT: "#f59e0b",
  CUSTOMER: "#10b981",
  CHURNED: "#94a3b8",
};

const CUSTOMER_LABELS: Record<string, string> = {
  LEAD: "Lead",
  PROSPECT: "Prospect",
  CUSTOMER: "Customer",
  CHURNED: "Churned",
};

function StatCard({
  href,
  color,
  Icon,
  label,
  value,
  sub,
}: {
  href: string;
  color: string;
  Icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, todo: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdminOrLead = user?.role === "ADMIN" || user?.role === "TEAM_LEAD";

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      try {
        const [taskRes, notifRes] = await Promise.all([
          api.get(`/tasks/stats/user/${user.id}`),
          api.get("/notifications/unread-count"),
        ]);

        setTaskStats({
          total: taskRes.data.totalTasks,
          todo: taskRes.data.todoTasks,
          inProgress: taskRes.data.inProgressTasks,
          completed: taskRes.data.completedTasks,
          overdue: taskRes.data.overdueTasks,
        });
        setUnreadNotifications(notifRes.data.unreadCount ?? 0);

        const customerRes = await api.get("/customers");
        setCustomers(customerRes.data);

        if (isAdminOrLead) {
          const usersRes = await api.get("/users");
          setTotalUsers(usersRes.data.length);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, isAdminOrLead]);

  // Build customer funnel chart data
  const customerFunnelData = Object.entries(
    customers.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    name: CUSTOMER_LABELS[status] ?? status,
    value: count,
    fill: CUSTOMER_COLORS[status] ?? "#94a3b8",
  }));

  const taskChartData = TASK_CHART_DATA(taskStats);
  const recentCustomers = [...customers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const completionRate = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="text-indigo-200 mt-1 text-sm">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        {taskStats.total > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-sm font-medium text-white">
              {completionRate}% tasks complete
            </span>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          href="/dashboard/tasks"
          color="bg-indigo-500"
          Icon={CheckCircle2}
          label="My Tasks"
          value={taskStats.total}
          sub={`${taskStats.completed} completed`}
        />
        <StatCard
          href="/dashboard/tasks"
          color="bg-amber-500"
          Icon={Clock}
          label="In Progress"
          value={taskStats.inProgress}
          sub={`${taskStats.todo} to do`}
        />
        <StatCard
          href="/dashboard/notifications"
          color="bg-purple-500"
          Icon={Bell}
          label="Notifications"
          value={unreadNotifications}
          sub="unread"
        />
        <StatCard
          href="/dashboard/tasks"
          color="bg-red-500"
          Icon={AlertTriangle}
          label="Overdue"
          value={taskStats.overdue}
          sub="tasks"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">My Task Breakdown</h2>
          {taskStats.total === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
              No tasks yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={taskChartData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  cursor={{ fill: "#f3f4f6" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {taskChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Customer Funnel Donut */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Customer Pipeline</h2>
            <Link
              href="/dashboard/customers"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {customerFunnelData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
              No customers yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={customerFunnelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {customerFunnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Recent Customers</h2>
            <Link
              href="/dashboard/customers"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No customers yet</p>
          ) : (
            <div className="space-y-3">
              {recentCustomers.map((c) => (
                <div key={c._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      {c.company ? (
                        <><Building2 className="w-3 h-3" />{c.company}</>
                      ) : (
                        <><Mail className="w-3 h-3" />{c.email}</>
                      )}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      CUSTOMER_COLORS[c.status]
                        ? ""
                        : ""
                    }`}
                    style={{
                      backgroundColor: CUSTOMER_COLORS[c.status] + "20",
                      color: CUSTOMER_COLORS[c.status],
                    }}
                  >
                    {CUSTOMER_LABELS[c.status] ?? c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Stats / Quick Links */}
        {isAdminOrLead ? (
          <div className="grid grid-cols-1 gap-4">
            <Link href="/dashboard/users">
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/team-stats">
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Team Performance</p>
                    <p className="text-sm text-gray-700 font-medium mt-0.5">View detailed stats</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          </div>
        ) : (
          <Link href="/dashboard/customers">
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Users2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Customers</p>
                  <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
