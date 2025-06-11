export const metadata = { title: "Hosted Page" };
export const dynamic = "force-static";

interface PageProps { params: { slug: string } }

export default function HostedPage({ params }: PageProps) {
  return (
    <article className="prose mx-auto py-16">
      <h1>{params.slug}</h1>
      <p>
        Welcome to your hosted page. Soon you'll be able to write Markdown
        content and publish it directly under pesos.site.
      </p>
      <p>This is just a preview of the upcoming hosted pages feature.</p>
    </article>
  );
}
