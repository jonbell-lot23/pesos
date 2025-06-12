export const metadata = {
  title: "Pricing - PESOS",
};

import PricingCard from "@/components/PricingCard";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto py-16 px-4">
      <h1 className="text-4xl font-semibold mb-12 text-center">Pricing</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <PricingCard
          title="Free"
          price="$0"
          features={[
            "Automatic weekly backups",
            "Simple status dashboard",
            "Export your data anytime",
            "Community support",
          ]}
        />
        <PricingCard
          title="Pro – Coming Soon"
          highlight
          features={["Coming soon!"]}
        />
      </div>
      <p className="text-center mt-12">
        Want updates when Pro launches?{' '}
        <Link href="/subscribe" className="text-blue-600 underline">
          Sign up for email notifications
        </Link>
        .
      </p>
      <p className="text-center mt-4 text-sm text-gray-600">
        Preview upcoming features on the{' '}
        <Link href="/link/demo" className="underline">link page demo</Link> and the{' '}
        <Link href="/magazine" className="underline">magazine</Link>.
      </p>
    </div>
  );
}
