import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SignupSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const { email } = SignupSchema.parse(await request.json());
    const prisma = (await import("@/lib/prismadb")).default;
    await prisma.emailSignup.create({ data: { email } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email signup failed:", error);
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
