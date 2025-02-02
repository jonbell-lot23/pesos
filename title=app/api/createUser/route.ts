export async function POST(req: Request) {
  try {
    // ... your logic to create a user ...

    // Check if a user with the same username already exists
    const existingUser = await prisma.pesos_User.findFirst({
      where: { username },
    });
    if (existingUser) {
      // If the user already exists, return it (so the client won't ask for one again)
      return new Response(JSON.stringify({ user: existingUser }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Error creating user:", err);
    return new Response(JSON.stringify({ error: "Failed to create user" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
