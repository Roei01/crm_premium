"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  MapPin,
  Users,
  CalendarIcon,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: string[];
  customerId?: string;
  customerName?: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

const STATUS_CONFIG = {
  SCHEDULED: { label: "Scheduled", color: "text-indigo-600", bg: "bg-indigo-50", dot: "bg-indigo-500" },
  COMPLETED: { label: "Completed", color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  CANCELLED: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-100", dot: "bg-gray-400" },
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EMPTY_FORM = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  location: "",
  attendees: "",
  customerName: "",
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: "short", month: "short", day: "numeric",
  });
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchMeetings = useCallback(async () => {
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
      const res = await api.get("/meetings", { params: { month: monthStr } });
      setMeetings(res.data);
    } catch {
      /* ignore */
    }
  }, [year, month]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const prevMonth = () =>
    setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(year, month + 1, 1));

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const meetingsOnDay = (day: Date) =>
    meetings.filter((m) => isSameDay(new Date(m.startTime), day));

  const selectedDayMeetings = selectedDay
    ? meetingsOnDay(selectedDay)
    : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const res = await api.post("/meetings", {
        title: form.title,
        description: form.description || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        location: form.location || undefined,
        attendees: form.attendees
          ? form.attendees.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        customerName: form.customerName || undefined,
      });
      setMeetings((prev) => [...prev, res.data]);
      setShowModal(false);
      setForm(EMPTY_FORM);
      setSelectedDay(new Date(res.data.startTime));
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Error creating meeting");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: Meeting["status"]) => {
    try {
      await api.put(`/meetings/${id}`, { status });
      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m))
      );
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this meeting?")) return;
    await api.delete(`/meetings/${id}`);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  const today = new Date();

  // Pre-fill startTime when opening modal from a selected day
  const openModal = () => {
    if (selectedDay) {
      const dateStr = selectedDay.toISOString().slice(0, 10);
      setForm((f) => ({
        ...f,
        startTime: `${dateStr}T09:00`,
        endTime: `${dateStr}T10:00`,
      }));
    }
    setShowModal(true);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Calendar */}
      <div className="flex-1 flex flex-col">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {MONTH_NAMES[month]} {year}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 grid-rows-6 flex-1">
            {calendarCells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50/50"
                  />
                );
              }

              const dayMeetings = meetingsOnDay(day);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const isPast = day < today && !isToday;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[80px] p-2 border-b border-r border-gray-100 text-left hover:bg-indigo-50/30 transition-colors flex flex-col ${
                    isSelected ? "bg-indigo-50" : isPast ? "bg-gray-50/50" : ""
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${
                      isToday
                        ? "bg-indigo-600 text-white"
                        : isSelected
                        ? "bg-indigo-100 text-indigo-700"
                        : isPast
                        ? "text-gray-400"
                        : "text-gray-800"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="space-y-0.5 w-full">
                    {dayMeetings.slice(0, 2).map((m) => (
                      <div
                        key={m.id}
                        className={`text-xs px-1 py-0.5 rounded truncate font-medium ${
                          STATUS_CONFIG[m.status].bg
                        } ${STATUS_CONFIG[m.status].color}`}
                      >
                        {formatTime(m.startTime)} {m.title}
                      </div>
                    ))}
                    {dayMeetings.length > 2 && (
                      <div className="text-xs text-gray-400 px-1">
                        +{dayMeetings.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-80 flex flex-col gap-4">
        {/* Selected Day Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-gray-900">
                {selectedDay
                  ? selectedDay.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
                  : "Select a day"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedDayMeetings.length} meeting{selectedDayMeetings.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Meetings List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {selectedDayMeetings.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No meetings</p>
              <button
                onClick={openModal}
                className="mt-3 text-xs text-indigo-600 hover:underline"
              >
                Schedule one
              </button>
            </div>
          ) : (
            selectedDayMeetings.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${STATUS_CONFIG[m.status].dot}`}
                    />
                    <p className="font-semibold text-gray-900 text-sm leading-snug">
                      {m.title}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 text-xs text-gray-500 pl-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {formatTime(m.startTime)} – {formatTime(m.endTime)}
                  </div>
                  {m.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {m.location}
                    </div>
                  )}
                  {m.customerName && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      {m.customerName}
                    </div>
                  )}
                  {m.attendees.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      {m.attendees.join(", ")}
                    </div>
                  )}
                  {m.description && (
                    <p className="text-gray-400 mt-1 line-clamp-2">
                      {m.description}
                    </p>
                  )}
                </div>

                {/* Status actions */}
                {m.status === "SCHEDULED" && (
                  <div className="flex gap-2 mt-3 pl-4">
                    <button
                      onClick={() => handleStatusChange(m.id, "COMPLETED")}
                      className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Done
                    </button>
                    <button
                      onClick={() => handleStatusChange(m.id, "CANCELLED")}
                      className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                )}
                {m.status !== "SCHEDULED" && (
                  <div className={`mt-2 pl-4 text-xs font-medium ${STATUS_CONFIG[m.status].color}`}>
                    {STATUS_CONFIG[m.status].label}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">New Meeting</h2>
              <button
                onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setFormError(""); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Meeting title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Office, Zoom, etc."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
                <input
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Customer name (optional)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Attendees</label>
                <input
                  value={form.attendees}
                  onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Comma-separated names or emails"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Meeting notes (optional)"
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setFormError(""); }}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Scheduling…" : "Schedule Meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
