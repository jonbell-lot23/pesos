"use server";

import { prisma } from "@/lib/prisma";
import { validateRSSFeed } from "@/app/actions";

interface ValidateRSSFeedSuccess {
  success: true;
  feedUrl?: string;
  title: string;
  postCount: number;
}

interface ValidateRSSFeedError {
  success: false;
  error: string;
}

type ValidateRSSFeedResult = ValidateRSSFeedSuccess | ValidateRSSFeedError;

export async function getUserSources(userId: string) {
  const user = await prisma.pesos_User.findUnique({
    where: { id: userId },
    include: {
      sources: {
        include: {
          source: true,
        },
      },
    },
  });

  return (
    user?.sources.map((us) => ({
      id: us.source.id,
      url: us.source.url,
      createdAt: us.createdAt,
    })) || []
  );
}

interface AddSourceSuccess {
  success: true;
  source: {
    id: number;
    url: string;
  };
}

interface AddSourceError {
  success: false;
  error: string;
}

type AddSourceResult = AddSourceSuccess | AddSourceError;

export async function addUserSource(
  userId: string,
  url: string
): Promise<AddSourceResult> {
  // First validate the RSS feed
  const result = (await validateRSSFeed(url)) as ValidateRSSFeedResult;
  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Use the discovered feed URL if available
  const finalUrl = result.feedUrl || url;

  try {
    // First try to find if the source already exists
    let source = await prisma.pesos_Sources.findUnique({
      where: { url: finalUrl },
    });

    // If source doesn't exist, create it
    if (!source) {
      source = await prisma.pesos_Sources.create({
        data: { url: finalUrl },
      });
    }

    // Create the user-source relationship if it doesn't exist
    await prisma.pesos_UserSources.create({
      data: {
        userId: userId,
        sourceId: source.id,
      },
    });

    return {
      success: true,
      source: {
        id: source.id,
        url: source.url,
      },
    };
  } catch (error) {
    console.error("Error adding source:", error);
    return {
      success: false,
      error: "Failed to add source to database",
    };
  }
}
