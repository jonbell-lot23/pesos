import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

export default function Confirmation() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Setup Complete!</CardTitle>
        <CardDescription className="text-center">Your Pasos account is now ready to use.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4">Congratulations! Your RSS feeds have been successfully added to Pasos.</p>
        <p className="mb-4">
          We'll automatically backup your feeds every night, ensuring you always have access to your favorite content.
        </p>
        <p>You can now close this window or return to the home page to add more feeds.</p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

