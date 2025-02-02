// Removed NextResponse import since we're using the native Response directly.
// Import your database client or user-creation module.
// For example, if you're using Prisma:
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // Ensure we have a valid JSON payload
    const data = await req.json();

    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { username } = data;

    if (!username || typeof username !== "string" || !username.trim()) {
      return new Response(JSON.stringify({ error: "Username is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if a user with the same username already exists
    const existingUser = await prisma.pesos_User.findFirst({
      where: { username },
    });
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Username already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create the user
    const user = await prisma.pesos_User.create({
      data: {
        id: crypto.randomUUID(),
        username: username.trim(),
      },
    });

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error creating user:", err);
    return new Response(JSON.stringify({ error: "Failed to create user" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export function GET() {
  return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
