export const metadata = {
  title: "Pricing - PESOS",
};

export default function PricingPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <h1 className="text-4xl font-semibold mb-12 text-center">Pricing</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Free</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Automatic weekly backups</li>
            <li>Simple status dashboard</li>
            <li>Export your data anytime</li>
            <li>Community support</li>
          </ul>
          <p className="text-gray-500 mt-4">Perfect for personal archiving.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Pro &ndash; Coming Soon</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Beautiful link pages that replace LinkTree</li>
            <li>Daily backups and priority processing</li>
            <li>Email notifications for every backup</li>
            <li>Usage analytics</li>
            <li>Priority support</li>
          </ul>
          <p className="text-gray-500 mt-4">
            $5/month once billing is enabled. Join the early access list below.
            Hosted pages and magazine access included.
          </p>
        </div>
      </div>
      <p className="text-center mt-12">
        Want updates when Pro launches?{' '}
        <a href="/subscribe" className="text-blue-600 underline">
          Sign up for email notifications
        </a>
        .
      </p>
      <p className="text-center mt-4 text-sm text-gray-600">
        Preview upcoming features on the{' '}
        <a href="/link/demo" className="underline">link page demo</a> and the{' '}
        <a href="/magazine" className="underline">magazine</a>.
      </p>
    </div>
  );
}
