"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { RotateCcw, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  deletedAt: string;
}

export default function DeletedUsersPage() {
  const { user } = useAuth();
  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchDeletedUsers = async () => {
    try {
      const response = await api.get("/users/deleted");
      setDeletedUsers(response.data);
    } catch (err) {
      console.error("Failed to fetch deleted users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const handleRestore = async (id: string) => {
    if (!confirm("Are you sure you want to restore this user?")) return;
    try {
      await api.put(`/users/${id}/restore`);
      setMessage("User restored successfully");
      setDeletedUsers(deletedUsers.filter((u) => u._id !== id));
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      alert("Failed to restore user");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (user?.role !== "ADMIN" && user?.role !== "TEAM_LEAD") {
    return <div className="p-8 text-red-600">Access Denied</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link
            href="/dashboard/users"
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <Trash2 className="mr-2 h-6 w-6 text-red-500" />
            Recycle Bin (Deleted Users)
          </h1>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
          {message}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {deletedUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No deleted users found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deleted At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deletedUsers.map((u) => (
                <tr key={u._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(u.deletedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRestore(u._id)}
                      className="text-green-600 hover:text-green-900 flex items-center justify-end w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

