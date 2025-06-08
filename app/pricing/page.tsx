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
            <li>Backup your projects</li>
            <li>Updates once a week</li>
          </ul>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Stay tuned</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Link tree that doesn&apos;t suck</li>
            <li>More frequent updates</li>
            <li>Notifications when backups are successful</li>
          </ul>
          <p className="text-gray-500 mt-4">We&apos;re working on it!</p>
        </div>
      </div>
    </div>
  );
}
