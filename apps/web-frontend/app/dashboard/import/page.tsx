"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface CustomerImport {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status?: string;
}

export default function ImportPage() {
  const [data, setData] = useState<CustomerImport[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");
    setSuccess("");
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws) as any[];

        // Normalize keys and basic validation
        const normalized = parsedData
          .map((row) => ({
            firstName: row.firstName || row["First Name"] || row["first_name"],
            lastName: row.lastName || row["Last Name"] || row["last_name"],
            email: row.email || row["Email"],
            phone: row.phone || row["Phone"],
            company: row.company || row["Company"],
            status: row.status || row["Status"] || "LEAD",
          }))
          .filter((r) => r.email && r.firstName); // Basic filter

        if (normalized.length === 0) {
          setError(
            "No valid data found. Please ensure headers are correct (firstName, lastName, email)."
          );
        } else {
          setData(normalized);
        }
      } catch (err) {
        setError("Failed to parse file.");
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (data.length === 0) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setImportErrors([]);

    try {
      const response = await api.post("/customers/import", data);

      if (response.data.errors && response.data.errors.length > 0) {
        setImportErrors(response.data.errors);
        setSuccess(response.data.message);
      } else {
        setSuccess(`Successfully imported ${data.length} customers.`);
        setData([]);
        setFileName("");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to import customers.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Customers</h1>
        <p className="mt-1 text-gray-500">
          Upload an Excel file (.xlsx, .xls) to bulk import customers.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="dropzone-file"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-500">XLSX or XLS (MAX. 10MB)</p>
            </div>
            <input
              id="dropzone-file"
              type="file"
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </label>
        </div>
        {fileName && (
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {fileName}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {importErrors.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 text-yellow-700 rounded-md">
          <h4 className="font-bold mb-2">Some imports failed:</h4>
          <ul className="list-disc list-inside text-sm">
            {importErrors.slice(0, 10).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {importErrors.length > 10 && (
              <li>...and {importErrors.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium">Preview ({data.length} records)</h3>
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Importing..." : "Confirm Import"}
            </button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 50).map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.firstName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 50 && (
              <div className="p-4 text-center text-gray-500 text-sm border-t">
                Showing first 50 rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
