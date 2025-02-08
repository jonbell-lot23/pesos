"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SignInButton, useUser } from "@clerk/nextjs";
import { format } from "date-fns";

interface Post {
  id: number;
  title: string;
  url: string;
  postdate: string;
  sourceId: number;
  slug: string;
}

export default function FeedPage() {
  const params = useParams();
  const { username } = params;
  const routeUsername = Array.isArray(username) ? username[0] : username;
  const { isLoaded, isSignedIn, user } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    console.log("[FeedPage] fetchPosts: Called with user:", user);
    if (!user?.id) {
      console.error("[FeedPage] fetchPosts: No user id, aborting fetch");
      return;
    }
    try {
      const payload = {
        clerkId: user.id,
        username: user.username ? user.username : routeUsername,
      };
      console.log("[FeedPage] fetchPosts: Sending payload:", payload);
      const res = await fetch("/api/get-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log(
        "[FeedPage] fetchPosts: Received response status:",
        res.status
      );
      const data = await res.json();
      console.log("[FeedPage] fetchPosts: API response data:", data);
      if (data.posts) {
        const sortedPosts = data.posts.sort(
          (a: Post, b: Post) =>
            new Date(b.postdate).getTime() - new Date(a.postdate).getTime()
        );
        setPosts(sortedPosts);
      } else {
        console.warn("[FeedPage] fetchPosts: No posts property in response");
      }
    } catch (error) {
      console.error("[FeedPage] fetchPosts: Error fetching posts:", error);
    } finally {
      setIsLoading(false);
      console.log("[FeedPage] fetchPosts: Completed, isLoading set to false");
    }
  }, [user?.id, user?.username, routeUsername]);

  useEffect(() => {
    console.log(
      "[FeedPage] useEffect: isSignedIn:",
      isSignedIn,
      "user:",
      user,
      "routeUsername:",
      routeUsername
    );
    // Allow fetch if user is signed in, has an id, and either username is not set or it matches the routeUsername
    if (
      isSignedIn &&
      user?.id &&
      (!user.username ||
        user.username.toLowerCase() === routeUsername.toLowerCase())
    ) {
      if (!user.username) {
        console.warn(
          "[FeedPage] useEffect: user.username is null, proceeding without username match check"
        );
      } else {
        console.log(
          "[FeedPage] useEffect: user.username matches routeUsername"
        );
      }
      fetchPosts();
    } else {
      console.warn(
        "[FeedPage] useEffect: User not signed in or username mismatch, not calling fetchPosts"
      );
      setIsLoading(false);
    }
  }, [isSignedIn, user?.id, user?.username, routeUsername, fetchPosts]);

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

  if (
    user?.username &&
    user.username.toLowerCase() !== routeUsername.toLowerCase()
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <p className="mb-4">Not authorized.</p>
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
                  href={`/post/${post.slug}`}
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
