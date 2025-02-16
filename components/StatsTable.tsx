"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ActivityEntry {
  date: string;
  count: number;
  type: string;
}

interface StatsTableProps {
  activity: ActivityEntry[];
}

export function StatsTable({ activity }: StatsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Activity Type</TableHead>
          <TableHead>Count</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activity.map((entry, index) => (
          <TableRow
            key={`${entry.date}-${entry.type}`}
            className="even:bg-muted/50"
          >
            <TableCell className="font-mono">{entry.date}</TableCell>
            <TableCell>{entry.type}</TableCell>
            <TableCell>{entry.count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
