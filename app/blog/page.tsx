import Link from "next/link";

export const metadata = {
  title: "Blog - PESOS",
};

const posts = [
  { slug: "hello-world", title: "Hello World" },
  { slug: "ai-blog-post", title: "AI Blog Post" },
  { slug: "end-state-file", title: "Checking the End State" },
  { slug: "not-ready-yet", title: "What's Next" },
  { slug: "final-update", title: "Final Update" },
  { slug: "week-in-review-0616", title: "Week in Review - June 16" },
];

export default function BlogIndex() {
  return (
    <div className="max-w-3xl mx-auto py-16">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="text-blue-600 underline">
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
