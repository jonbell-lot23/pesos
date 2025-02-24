import { NextResponse } from "next/server";
import { setViewPreference } from "@/lib/cookies";

export async function POST(request: Request) {
  try {
    const { preference } = await request.json();

    if (preference !== "simple" && preference !== "detailed") {
      return NextResponse.json(
        { error: "Invalid preference value" },
        { status: 400 }
      );
    }

    setViewPreference(preference);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting view preference:", error);
    return NextResponse.json(
      { error: "Failed to set view preference" },
      { status: 500 }
    );
  }
}
