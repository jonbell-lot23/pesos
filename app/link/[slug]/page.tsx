export const metadata = { title: "Link Page" };
export const dynamic = "force-static";

interface PageProps {
  params: { slug: string };
}

const sampleLinks = [
  { title: "My Blog", url: "https://example.com" },
  { title: "GitHub", url: "https://github.com/example" },
  { title: "Contact", url: "mailto:you@example.com" },
];

export default function LinkPage({ params }: PageProps) {
  return (
    <div className="max-w-md mx-auto py-16 space-y-4 text-center">
      <h1 className="text-3xl font-bold">{params.slug}</h1>
      <p className="text-gray-600 mb-4">
        This is a demo of the new PESOS link page. You'll be able to customise
        links and styles soon.
      </p>
      <ul className="space-y-2">
        {sampleLinks.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              className="block bg-blue-600 text-white py-2 rounded"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
