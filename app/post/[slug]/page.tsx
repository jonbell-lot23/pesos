import { PrismaClient } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/post-content";

const prisma = new PrismaClient();

// Update the interface to extend Next.js PageProps
type Props = {
  params: {
    slug: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Generate metadata for the page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
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

// Update the component props type
export default async function PostPage({ params, searchParams }: Props) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return <PostContent post={post} />;
}
