// app/post/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/post-content";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

async function getPost(slug: string) {
  // Build detection for page components
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return null;
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;
    return await prisma.pesos_items.findFirst({
      where: { slug },
    });
  } catch (error) {
    console.error("Database error:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  // Build detection for metadata generation
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return {
      title: "Post | PESOS",
      description: "A post from PESOS.",
    };
  }

  try {
    const post = await getPost(params.slug);
    if (!post) {
      return {
        title: "Post Not Found | PESOS",
        description: "The requested post could not be found.",
      };
    }
    return {
      title: post.title + " | PESOS",
      description: post.description ?? undefined,
    };
  } catch (error) {
    return {
      title: "Error | PESOS",
      description: "An error occurred while loading the post.",
    };
  }
}

export default async function Page({ params }: { params: { slug: string } }) {
  try {
    const post = await getPost(params.slug);
    if (!post) {
      notFound();
    }
    return (
      <div className="absolute inset-0 bg-white">
        <PostContent post={post} />
      </div>
    );
  } catch (error) {
    return (
      <div className="absolute inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading Post
          </h1>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    );
  }
}
