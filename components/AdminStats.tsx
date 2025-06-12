import { Users, LogIn, RefreshCcw, AlertCircle } from "lucide-react";

interface Stats {
  newUsers: number;
  totalLogins: number;
  errorCount: number;
  systemUpdates: number;
  period: string;
}

export default function AdminStats({ stats }: { stats: Stats }) {
  const items = [
    { label: "New Users", value: stats.newUsers, Icon: Users },
    { label: "Logins", value: stats.totalLogins, Icon: LogIn },
    { label: "Updates", value: stats.systemUpdates, Icon: RefreshCcw },
    { label: "Errors", value: stats.errorCount, Icon: AlertCircle },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-xl bg-white/70 backdrop-blur-md p-4 shadow"
          >
            <Icon className="mb-2 h-5 w-5 text-gray-600" />
            <div className="text-2xl font-semibold text-gray-800">{value}</div>
            <div className="text-xs uppercase tracking-wide text-gray-500">
              {label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-center text-xs text-gray-600">
        {stats.period}
      </div>
    </div>
  );
}
