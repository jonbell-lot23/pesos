import { useEffect } from "react";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const oldChosenUsername = localStorage.getItem("chosenUsername");
      console.log(
        "[LoginPage] On mount, old chosenUsername:",
        oldChosenUsername
      );
      localStorage.removeItem("chosenUsername");
      console.log(
        "[LoginPage] After clearing, chosenUsername:",
        localStorage.getItem("chosenUsername")
      );
    }
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <h1>Login Page</h1>
      <SignIn path="/sign-in" routing="path" />
    </div>
  );
}
