import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PricingCardProps {
  title: string;
  price?: string;
  features: string[];
  highlight?: boolean;
  cta?: React.ReactNode;
}

export default function PricingCard({ title, price, features, highlight, cta }: PricingCardProps) {
  return (
    <Card
      className={highlight ? "border-blue-500 shadow-lg" : "border-gray-200"}
    >
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {title}
        </CardTitle>
        {price && <div className="text-gray-500 mt-1">{price}</div>}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-gray-700">
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </CardContent>
      {cta && <CardFooter>{cta}</CardFooter>}
    </Card>
  );
}
