import Link from "next/link";

export default function SetupComplete() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Setup Complete</h1>
        <p className="mb-4">You're all set! Enjoy using PESOS.</p>
        <Link href="/dashboard" className="text-blue-600 underline">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
