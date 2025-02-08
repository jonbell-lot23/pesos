"use client";

import { useCallback, useEffect, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { format } from "date-fns";

interface Post {
  id: number;
  title: string;
  url: string;
  postdate: string;
  sourceId: number;
}

export default function FeedPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch("/api/get-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: user.id }),
      });

      const data = await res.json();
      if (data.posts) {
        // Sort posts by date in reverse chronological order
        const sortedPosts = data.posts.sort(
          (a: Post, b: Post) =>
            new Date(b.postdate).getTime() - new Date(a.postdate).getTime()
        );
        setPosts(sortedPosts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchPosts();
    }
  }, [isSignedIn, user?.id, fetchPosts]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <p className="mb-4">You must be signed in to continue.</p>
        <SignInButton />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col p-8 bg-white min-h-screen">
      <h1 className="text-black text-2xl mb-8">Your Feed</h1>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-start">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-medium text-blue-600 hover:text-blue-800"
                >
                  {post.title}
                </a>
                <time className="text-sm text-gray-500">
                  {format(new Date(post.postdate), "MMM d, yyyy")}
                </time>
              </div>
            </article>
          ))}

          {posts.length === 0 && (
            <p className="text-center text-gray-500">No posts found</p>
          )}
        </div>
      )}
    </div>
  );
}
