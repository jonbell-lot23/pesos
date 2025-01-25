"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

export default function GoogleAuth() {
  const router = useRouter()

  const handleAuth = () => {
    // In a real application, this would trigger the actual Google Auth flow
    console.log("Google Auth initiated")
    router.push("/confirmation")
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Google Authentication</CardTitle>
        <CardDescription>Connect your Google account to complete the setup.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          To securely store your RSS feed backups, we need to connect to your Google account. This allows us to save
          your data in Google Drive.
        </p>
        <p className="mb-4">
          Don't worry, we only request access to a specific folder for Pasos and won't access any of your other data.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={handleAuth}>Connect Google Account</Button>
      </CardFooter>
    </Card>
  )
}

