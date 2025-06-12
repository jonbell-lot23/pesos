"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">System Logs</h1>
      {stats && (
        <div className="flex space-x-4 mb-4 text-sm text-gray-700">
          <span>New Users: {stats.newUsers}</span>
          <span>Logins: {stats.totalLogins}</span>
          <span>Updates: {stats.systemUpdates}</span>
          <span className="text-red-600">Errors: {stats.errorCount}</span>
        </div>
      )}
      <Button onClick={fetchLogs} className="mb-4" size="sm">
        Refresh
      </Button>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full text-sm text-left text-gray-800">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="px-2 py-1">Time</th>
              <th className="px-2 py-1">Event</th>
              <th className="px-2 py-1">User</th>
              <th className="px-2 py-1">Success</th>
              <th className="px-2 py-1">Source</th>
              <th className="px-2 py-1">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-100">
                <td className="px-2 py-1">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-2 py-1">{log.eventType}</td>
                <td className="px-2 py-1">{log.userId || "-"}</td>
                <td className="px-2 py-1">
                  <span className={log.success ? "text-green-600" : "text-red-600"}>
                    {log.success ? "✓" : "✗"}
                  </span>
                </td>
                <td className="px-2 py-1">{log.source || "-"}</td>
                <td className="px-2 py-1">
                  {log.metadata ? JSON.stringify(log.metadata) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
