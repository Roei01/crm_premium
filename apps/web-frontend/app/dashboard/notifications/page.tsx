"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Bell, Check } from "lucide-react";

interface Notification {
  _id: string;
  title: string;
  message: string;
  userId: string;
  tenantId: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Bell className="mr-2 h-6 w-6" />
          Notifications
        </h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <li
                key={notification._id}
                className={`p-6 ${
                  !notification.isRead ? "bg-blue-50" : "bg-white"
                } hover:bg-gray-50`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {notification.isRead ? (
                      <Check className="h-6 w-6 text-green-500" />
                    ) : (
                      <Bell className="h-6 w-6 text-blue-500" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
