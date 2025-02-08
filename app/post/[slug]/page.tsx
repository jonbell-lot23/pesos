import { PrismaClient } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/post-content";

const prisma = new PrismaClient();

// Use Next.js's built-in types
export interface GenerateMetadataProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: GenerateMetadataProps): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: `${post.title} | PESOS`,
    description: post.description ?? undefined,
    openGraph: {
      title: post.title,
      description: post.description ?? undefined,
      type: "article",
    },
  };
}

async function getPost(slug: string) {
  try {
    const post = await prisma.pesos_items.findFirst({
      where: {
        slug: slug,
      },
    });
    return post;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

// For the page component
export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return <PostContent post={post} />;
}
