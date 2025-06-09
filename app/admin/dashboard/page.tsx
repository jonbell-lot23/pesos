import prisma from "@/lib/prismadb";

export const dynamic = "force-dynamic";

interface LogEntry {
  id: number;
  timestamp: Date;
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

async function getLogs(): Promise<LogEntry[]> {
  const logs = await prisma.activityLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
  });
  return logs;
}

export default async function AdminDashboard() {
  const logs = await getLogs();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">System Logs</h1>
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
    </div>
  );
}
