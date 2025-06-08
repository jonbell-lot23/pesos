import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
  });
  return NextResponse.json({ logs });
}
