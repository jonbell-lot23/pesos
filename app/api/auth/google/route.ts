import { NextResponse } from "next/server"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export async function POST(request: Request) {
  const body = await request.json()
  const { credential } = body

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()

    if (payload) {
      // Here you would typically create a user session or JWT token
      // For this example, we'll just return success
      return NextResponse.json({ success: true, user: payload })
    } else {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error verifying Google token:", error)
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 })
  }
}

