export async function POST(req: Request) {
  try {
    // ... your logic to create a user ...
  } catch (err) {
    console.error("Error creating user:", err);
    return new Response(JSON.stringify({ error: "Failed to create user" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
