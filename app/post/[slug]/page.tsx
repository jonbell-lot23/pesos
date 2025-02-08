import { PrismaClient } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/post-content";
import { ResolvingMetadata } from "next";

const prisma = new PrismaClient();

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.slug);

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

export default async function PostPage({ params }: Props) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return <PostContent post={post} />;
}
