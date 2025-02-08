import { PrismaClient } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/post-content";

const prisma = new PrismaClient();

interface PageParams {
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
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
      where: { slug },
    });
    return post;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

export default async function PostPage({ params }: { params: PageParams }) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return <PostContent post={post} />;
}
