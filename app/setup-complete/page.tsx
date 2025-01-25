import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SetupComplete() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-white p-4">
      <h1 className="text-3xl font-bold mb-6">Setup Complete!</h1>
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <p className="mb-4">
          Congratulations! Your PESOS* account has been successfully set up. We've scheduled nightly automated backups
          for your RSS feeds, ensuring you control your stuff, even when sites go dark, or turn into nazis, or whatever.
        </p>
        <h2 className="text-xl font-semibold mb-2">What's Next?</h2>
        <ul className="list-disc list-inside mb-6">
          <li>Your feeds will be aggregated daily</li>
          <li>Backups will run automatically every night</li>
          <li>You can access your content anytime</li>
        </ul>
        <Link href="/feed-display">
          <Button className="w-full">Go to Dashboard</Button>
        </Link>
        <p className="text-sm mt-8 text-center">*Publish Elsewhere, Syndicate (to your) Own Site</p>
      </div>
    </div>
  )
}

