import { NextResponse } from "next/server";
import { getUserSources } from "@/app/actions/sources";

export async function POST(request: Request) {
  const body = await request.json();
  const clerkId = body.clerkId;
  try {
    const sources = await getUserSources(clerkId);
    return NextResponse.json({ success: true, sources });
  } catch (error) {
    console.error("API Error in get-user-sources:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage });
  }
}
