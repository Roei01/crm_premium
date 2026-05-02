"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/lib/api";
import {
  Plus,
  Search,
  X,
  Mail,
  Phone,
  Building2,
  ChevronRight,
  ChevronLeft,
  LayoutList,
  LayoutGrid,
  Trash2,
  User as UserIcon,
  Send,
} from "lucide-react";

type CustomerStatus = "LEAD" | "PROSPECT" | "CUSTOMER" | "CHURNED";

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: CustomerStatus;
  assignedTo?: string;
  createdAt: string;
}

const STATUS_ORDER: CustomerStatus[] = [
  "LEAD",
  "PROSPECT",
  "CUSTOMER",
  "CHURNED",
];

const STATUS_CONFIG: Record<
  CustomerStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  LEAD: {
    label: "Lead",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  PROSPECT: {
    label: "Prospect",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  CUSTOMER: {
    label: "Customer",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  CHURNED: {
    label: "Churned",
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-200",
    dot: "bg-gray-400",
  },
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  status: "LEAD" as CustomerStatus,
};

const EMPTY_EMAIL_FORM = { subject: "", body: "" };

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | "">("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Email modal state
  const [emailTarget, setEmailTarget] = useState<Customer | null>(null);
  const [emailForm, setEmailForm] = useState(EMPTY_EMAIL_FORM);
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      const res = await api.get("/customers", { params });
      setCustomers(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/customers", form);
      setCustomers((prev) => [res.data, ...prev]);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error creating customer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    customerId: string,
    newStatus: CustomerStatus
  ) => {
    try {
      await api.patch(`/customers/${customerId}`, { status: newStatus });
      setCustomers((prev) =>
        prev.map((c) =>
          c._id === customerId ? { ...c, status: newStatus } : c
        )
      );
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await api.delete(`/customers/${customerId}`);
      setCustomers((prev) => prev.filter((c) => c._id !== customerId));
    } catch {
      /* ignore */
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTarget) return;
    setEmailSending(true);
    setEmailError("");
    setEmailSuccess("");
    try {
      await api.post("/emails/send", {
        to: emailTarget.email,
        toName: `${emailTarget.firstName} ${emailTarget.lastName}`,
        subject: emailForm.subject,
        body: emailForm.body,
      });
      setEmailSuccess("Email sent successfully!");
      setTimeout(() => {
        setEmailTarget(null);
        setEmailForm(EMPTY_EMAIL_FORM);
        setEmailSuccess("");
      }, 1500);
    } catch (err: any) {
      setEmailError(err.response?.data?.message || "Failed to send email");
    } finally {
      setEmailSending(false);
    }
  };

  const moveStatus = (customer: Customer, direction: "prev" | "next") => {
    const idx = STATUS_ORDER.indexOf(customer.status);
    const newIdx = direction === "next" ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return;
    handleStatusChange(customer._id, STATUS_ORDER[newIdx]);
  };

  const getInitials = (c: Customer) =>
    `${c.firstName.charAt(0)}${c.lastName.charAt(0)}`.toUpperCase();

  const columnCustomers = (status: CustomerStatus) =>
    customers.filter((c) => c.status === status);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {customers.length} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "list"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "kanban"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {(["", ...STATUS_ORDER] as (CustomerStatus | "")[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterStatus === s
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {s === "" ? "All" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Loading…
        </div>
      ) : view === "list" ? (
        <ListView
          customers={customers}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onEmail={setEmailTarget}
          getInitials={getInitials}
        />
      ) : (
        <KanbanView
          customers={customers}
          onMove={moveStatus}
          onDelete={handleDelete}
          onEmail={setEmailTarget}
          getInitials={getInitials}
        />
      )}

      {/* Send Email Modal */}
      {emailTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Send Email</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  To: {emailTarget.firstName} {emailTarget.lastName} &lt;{emailTarget.email}&gt;
                </p>
              </div>
              <button
                onClick={() => { setEmailTarget(null); setEmailForm(EMPTY_EMAIL_FORM); setEmailError(""); setEmailSuccess(""); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  required
                  value={emailForm.body}
                  onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
                  rows={5}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Write your message…"
                />
              </div>
              {emailError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{emailError}</p>
              )}
              {emailSuccess && (
                <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{emailSuccess}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEmailTarget(null); setEmailForm(EMPTY_EMAIL_FORM); setEmailError(""); setEmailSuccess(""); }}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailSending}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {emailSending ? "Sending…" : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                New Customer
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(EMPTY_FORM);
                  setError("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    value={form.company}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, company: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as CustomerStatus,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setForm(EMPTY_FORM);
                    setError("");
                  }}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Creating…" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── List View ─── */
function ListView({
  customers,
  onStatusChange,
  onDelete,
  onEmail,
  getInitials,
}: {
  customers: Customer[];
  onStatusChange: (id: string, status: CustomerStatus) => void;
  onDelete: (id: string) => void;
  onEmail: (c: Customer) => void;
  getInitials: (c: Customer) => string;
}) {
  if (customers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">No customers found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              Name
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              Company
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              Contact
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              Status
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              Added
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {customers.map((c) => {
            const cfg = STATUS_CONFIG[c.status];
            return (
              <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                      {getInitials(c)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {c.firstName} {c.lastName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.company || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Mail className="w-3 h-3" />
                      {c.email}
                    </span>
                    {c.phone && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={c.status}
                    onChange={(e) =>
                      onStatusChange(c._id, e.target.value as CustomerStatus)
                    }
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border} focus:outline-none cursor-pointer`}
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEmail(c)}
                      className="text-gray-400 hover:text-indigo-500 transition-colors"
                      title="Send email"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(c._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Kanban View ─── */
function KanbanView({
  customers,
  onMove,
  onDelete,
  onEmail,
  getInitials,
}: {
  customers: Customer[];
  onMove: (customer: Customer, direction: "prev" | "next") => void;
  onDelete: (id: string) => void;
  onEmail: (c: Customer) => void;
  getInitials: (c: Customer) => string;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
      {STATUS_ORDER.map((status, colIdx) => {
        const cfg = STATUS_CONFIG[status];
        const colCustomers = customers.filter((c) => c.status === status);

        return (
          <div
            key={status}
            className="flex-shrink-0 w-72 flex flex-col bg-gray-50 rounded-xl border border-gray-200"
          >
            {/* Column Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="font-semibold text-gray-800 text-sm">
                  {cfg.label}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
              >
                {colCustomers.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {colCustomers.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-6">
                  No customers
                </p>
              )}
              {colCustomers.map((c) => (
                <div
                  key={c._id}
                  className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {getInitials(c)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {c.firstName} {c.lastName}
                        </p>
                        {c.company && (
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            {c.company}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onDelete(c._id)}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    {c.email}
                  </p>
                  {/* Email button */}
                  <button
                    onClick={() => onEmail(c)}
                    className="mt-2 w-full flex items-center justify-center gap-1 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                  >
                    <Mail className="w-3 h-3" />
                    Send Email
                  </button>
                  {/* Move buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onMove(c, "prev")}
                      disabled={colIdx === 0}
                      className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      {colIdx > 0 ? STATUS_CONFIG[STATUS_ORDER[colIdx - 1]].label : "—"}
                    </button>
                    <button
                      onClick={() => onMove(c, "next")}
                      disabled={colIdx === STATUS_ORDER.length - 1}
                      className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200"
                    >
                      {colIdx < STATUS_ORDER.length - 1
                        ? STATUS_CONFIG[STATUS_ORDER[colIdx + 1]].label
                        : "—"}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
