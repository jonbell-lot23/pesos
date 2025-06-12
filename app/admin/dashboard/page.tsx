"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import AdminStats from "@/components/AdminStats";

interface LogEntry {
  id: number;
  timestamp: string;
  eventType: string;
  userId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  duration?: number | null;
  success: boolean;
  errorMessage?: string | null;
  source?: string | null;
}

interface Stats {
  newUsers: number;
  totalLogins: number;
  errorCount: number;
  systemUpdates: number;
  period: string;
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/activity-logs");
    const data = await res.json();
    setLogs(data.logs);
    setStats(data.stats);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-6">
      <h1 className="mb-8 text-center text-3xl font-bold">Admin Dashboard</h1>
      {stats && <AdminStats stats={stats} />}
      <div className="mb-4 text-right">
        <Button onClick={fetchLogs} size="sm">
          Refresh
        </Button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-auto rounded-xl bg-white shadow">
          <table className="min-w-full text-sm text-gray-800">
            <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Success</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{log.eventType}</td>
                  <td className="px-3 py-2">{log.userId || "-"}</td>
                  <td className="px-3 py-2">
                    <span className={log.success ? "text-green-600" : "text-red-600"}>
                      {log.success ? "✓" : "✗"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{log.source || "-"}</td>
                  <td className="px-3 py-2 text-xs">
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
