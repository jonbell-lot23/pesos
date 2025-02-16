// app/post/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/post-content";
import prisma from "@/lib/prismadb";

async function getPost(slug: string) {
  try {
    return await prisma.pesos_items.findFirst({
      where: { slug },
    });
  } catch (error) {
    console.error("Database error:", error);
    throw new Error(
      "Unable to connect to the database. Please try again later."
    );
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) {
    notFound();
  }
  return {
    title: post.title + " | PESOS",
    description: post.description ?? undefined,
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) {
    notFound();
  }
  return <PostContent post={post} />;
}
