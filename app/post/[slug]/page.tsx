// app/post/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/post-content";
import prisma from "@/lib/prismadb";

async function getPost(slug: string) {
  return prisma.pesos_items.findFirst({
    where: { slug },
  });
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
