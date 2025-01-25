import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-white p-4 w-full">
      <h1 className="text-4xl font-bold text-center mb-4">Welcome to PESOS*</h1>
      <p className="text-xl text-center mb-8 max-w-4xl">
        Back up all your little RSS feeds nightly so you control your stuff, even when sites go dark, or turn into
        nazis, or whatever
      </p>
      <Link href="/feed-selection">
        <Button size="lg" className="mb-8">
          Get Started
        </Button>
      </Link>
      <p className="text-sm text-center max-w-md">*Publish Elsewhere, Syndicate (to your) Own Site</p>
    </div>
  )
}

