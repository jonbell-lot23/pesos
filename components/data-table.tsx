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
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function DataTable({ posts }: DataTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>title & url</TableHead>
          <TableHead>description</TableHead>
          <TableHead>postdate</TableHead>
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
            <TableCell>
              {formatDistanceToNow(new Date(post.postdate), {
                addSuffix: true,
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
