import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Profile() {
  return (
    <div className="container mx-auto p-4 w-full max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <p className="mb-2">
          <strong>Name:</strong> John Doe
        </p>
        <p className="mb-2">
          <strong>Email:</strong> john.doe@example.com
        </p>
        <p className="mb-4">
          <strong>Account Type:</strong> Premium
        </p>
        <Link href="/feed-display">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

