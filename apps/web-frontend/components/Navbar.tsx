"use client";

import { useAuth } from '@/app/context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { logout, user } = useAuth();

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-800">
        Welcome, {user?.firstName || 'User'}
      </h1>
      <button
        onClick={logout}
        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </button>
    </header>
  );
}

