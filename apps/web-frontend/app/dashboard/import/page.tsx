"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";

interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status?: "LEAD" | "ACTIVE" | "INACTIVE";
}

export default function ImportPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canImport = user?.role === "ADMIN" || user?.role === "TEAM_LEAD";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const parsed: Customer[] = json.map((row) => ({
          firstName: row.firstName || row["First Name"] || "",
          lastName: row.lastName || row["Last Name"] || "",
          email: row.email || row.Email || "",
          phone: row.phone || row.Phone || "",
          company: row.company || row.Company || "",
          status: row.status || row.Status || "LEAD",
        }));

        setCustomers(parsed);
        setError("");
      } catch (err: any) {
        setError("Failed to parse Excel file: " + err.message);
        setCustomers([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (customers.length === 0) {
      setError("No customers to import");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/customers/import", customers);
      setMessage(response.data.message || "Import successful!");
      setCustomers([]);
      // Reset file input
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to import customers");
    } finally {
      setLoading(false);
    }
  };

  if (!canImport) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">
          Only ADMIN or TEAM_LEAD can import customers
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Import Customers from Excel
      </h1>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Excel File (.xlsx, .xls)
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
          <p className="mt-2 text-xs text-gray-500">
            Expected columns: firstName, lastName, email, phone, company, status
          </p>
        </div>

        {customers.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Preview ({customers.length} customers)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      First Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.slice(0, 10).map((customer, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.firstName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.phone || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.company || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length > 10 && (
                <p className="mt-2 text-sm text-gray-500">
                  ... and {customers.length - 10} more
                </p>
              )}
            </div>

            <div className="mt-4">
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading
                  ? "Importing..."
                  : `Import ${customers.length} Customers`}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {message && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
