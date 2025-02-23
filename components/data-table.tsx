"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: number;
  title: string;
  url: string;
  description: string | null;
  postdate: Date;
  source: string | null;
  slug: string | null;
  Source: {
    emoji: string;
    name: string;
    userid: number;
  } | null;
}

interface DataTableProps {
  posts: Post[];
}

function stripHtml(html: string) {
  if (typeof window === "undefined") {
    // Server-side: Use basic string replacement
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  }

  // Client-side: Use DOM parsing
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

const formatTimeShort = (date: Date) => {
  const distance = formatDistanceToNow(new Date(date), { addSuffix: false });
  return distance
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" months", "mo")
    .replace(" month", "mo")
    .replace(" years", "y")
    .replace(" year", "y")
    .replace("about ", "")
    .replace("over ", "")
    .replace("almost ", "");
};

export function DataTable({ posts }: DataTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>title & url</TableHead>
          <TableHead>description</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.url} className="even:bg-muted/50">
            <TableCell className="max-w-[240px] truncate">
              <a
                href={`/post/${post.slug}`}
                className="text-blue-600 hover:underline truncate block"
              >
                {post.title}
              </a>
            </TableCell>
            <TableCell className="max-w-[640px] truncate">
              {post.description && (
                <span className="text-sm text-gray-600">
                  {stripHtml(post.description).slice(0, 120)}
                  {post.description.length > 120 ? "..." : ""}
                </span>
              )}
            </TableCell>
            <TableCell>{formatTimeShort(post.postdate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
