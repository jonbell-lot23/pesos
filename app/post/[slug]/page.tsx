import { PrismaClient } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/post-content";

const prisma = new PrismaClient();

type PageProps = {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

// Generate metadata for the page
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const post = await getPost(props.params.slug);

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

export default async function PostPage(props: PageProps) {
  const post = await getPost(props.params.slug);

  if (!post) {
    notFound();
  }

  return <PostContent post={post} />;
}
