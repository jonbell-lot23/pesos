import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Fetch all data related to the user
    const userData = await prisma.pesos_User.findUnique({
      where: { id: userId },
      include: {
        sources: {
          include: {
            source: true,
          },
        },
        pesos_items: true,
      },
    });

    if (!userData) {
      return new NextResponse(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Create a JSON response with the appropriate headers for download
    const response = new NextResponse(JSON.stringify(userData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=backup.json",
      },
    });

    return response;
  } catch (error) {
    console.error("Export error:", error);
    return new NextResponse(JSON.stringify({ error: "Export failed" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
