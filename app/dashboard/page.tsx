import { redirect } from "next/navigation";
import { getViewPreference } from "@/lib/cookies";

export default function Dashboard() {
  const preference = getViewPreference();

  if (preference === "detailed") {
    redirect("/dashboard/all_posts");
  }

  // By default, show the simple view
  redirect("/dashboard/simple");
}
