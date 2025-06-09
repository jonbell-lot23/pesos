import useSWR from "swr";

export const dynamic = "force-dynamic";

interface LogEntry {
  id: number;
  eventType: string;
  message: string;
  userId?: string | null;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboard() {
  const { data, error } = useSWR<{ logs: LogEntry[] }>("/api/admin/logs", fetcher);

  if (error) return <div>Error loading logs</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">System Logs</h1>
      <table className="min-w-full text-sm text-left text-gray-300">
        <thead className="border-b border-gray-700">
          <tr>
            <th className="px-2 py-1">Time</th>
            <th className="px-2 py-1">Event</th>
            <th className="px-2 py-1">User</th>
            <th className="px-2 py-1">Message</th>
          </tr>
        </thead>
        <tbody>
          {data.logs.map((log) => (
            <tr key={log.id} className="border-b border-gray-800">
              <td className="px-2 py-1">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="px-2 py-1">{log.eventType}</td>
              <td className="px-2 py-1">{log.userId || "-"}</td>
              <td className="px-2 py-1">{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
