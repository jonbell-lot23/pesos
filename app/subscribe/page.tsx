"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Subscribe - PESOS",
};

export default function SubscribePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("Thanks! We'll keep you posted.");
        setEmail("");
      } else {
        setStatus("Something went wrong");
      }
    } catch {
      setStatus("Network error");
    }
  };

  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-2xl font-bold mb-4 text-center">Get Updates</h1>
      <p className="mb-6 text-center">
        Drop your email and we'll let you know when new features launch.
      </p>
      <div className="flex space-x-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1"
        />
        <Button onClick={handleSubmit} disabled={!email}>
          Sign Up
        </Button>
      </div>
      {status && <p className="mt-4 text-center">{status}</p>}
    </div>
  );
}
