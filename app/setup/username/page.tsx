"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChooseUsername() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleNext = () => {
    localStorage.setItem("chosenUsername", username.trim());
    router.push("/setup/feeds");
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Choose a username</h1>
      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="username"
        className="mb-4"
      />
      <Button onClick={handleNext} disabled={!username.trim()}>
        Continue
      </Button>
    </div>
  );
}
