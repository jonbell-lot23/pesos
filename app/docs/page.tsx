export const metadata = { title: "Documentation - PESOS" };

const docs = [
  { slug: "data-format", title: "Data Export Formats" },
  { slug: "new-user-wizard", title: "New User Wizard" },
];

export default function DocsIndex() {
  return (
    <div className="max-w-3xl mx-auto py-16">
      <h1 className="text-3xl font-bold mb-6">Documentation</h1>
      <ul className="space-y-2">
        {docs.map((doc) => (
          <li key={doc.slug}>
            <a href={`/docs/${doc.slug}`} className="text-blue-600 underline">
              {doc.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
