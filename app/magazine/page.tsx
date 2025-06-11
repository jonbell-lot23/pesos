export const metadata = { title: "PESOS Magazine" };
export const dynamic = "force-static";

export default function MagazinePage() {
  const sampleItems = [
    { title: "First Highlight", description: "An example of a saved item." },
    { title: "Second Highlight", description: "Another item you'll be able to browse." },
  ];

  return (
    <div className="max-w-3xl mx-auto py-16 space-y-6">
      <h1 className="text-3xl font-bold">PESOS Magazine</h1>
      <p className="text-gray-700">
        Coming soon: browse public highlights collected by PESOS users.
      </p>
      <ul className="space-y-4">
        {sampleItems.map((item) => (
          <li key={item.title} className="border p-4 rounded">
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p>{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
