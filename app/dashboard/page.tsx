import { redirect } from "next/navigation";
import { getViewPreference } from "@/lib/cookies";
import SimpleDashboard from "./simple/page";

export default function Dashboard() {
  const preference = getViewPreference();

  if (preference === "detailed") {
    redirect("/dashboard/detailed");
  }

  return <SimpleDashboard />;
}
