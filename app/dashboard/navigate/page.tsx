"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface Source {
  id: number;
  url: string;
  lastPost: string | null;
  isUserSource: boolean;
}

interface Post {
  id: number;
  title: string;
  url: string;
  postdate: string;
  description: string;
  userId: string;
  isUserPost: boolean;
}

export default function NavigatePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch active sources on initial load
  useEffect(() => {
    const fetchSources = async () => {
      try {
        setLoading(true);
        // This would need to be replaced with an actual API endpoint
        const response = await fetch("/api/active-sources");
        if (!response.ok) {
          throw new Error("Failed to fetch sources");
        }
        const data = await response.json();

        // Sort sources by last post recency
        const sortedSources = data.sources.sort((a: Source, b: Source) => {
          if (!a.lastPost) return 1;
          if (!b.lastPost) return -1;
          return (
            new Date(b.lastPost).getTime() - new Date(a.lastPost).getTime()
          );
        });

        setSources(sortedSources);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching sources:", error);
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  // Fetch posts when a source is selected
  useEffect(() => {
    const fetchPosts = async () => {
      if (!selectedSource) return;

      try {
        setLoading(true);
        // This would need to be replaced with an actual API endpoint
        const response = await fetch(
          `/api/posts-by-source?sourceId=${selectedSource}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }
        const data = await response.json();
        setPosts(data.posts);
        setSelectedPost(null); // Clear selected post when source changes
        setLoading(false);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedSource]);

  const getSourceDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain;
    } catch {
      return url;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // For placeholder data until we have real API endpoints
  const placeholderSources = useMemo(
    () => [
      {
        id: 1,
        url: "https://example.com/feed1",
        lastPost: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isUserSource: true,
      },
      {
        id: 2,
        url: "https://blog.example.org/rss",
        lastPost: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        isUserSource: true,
      },
      {
        id: 3,
        url: "https://news.example.net/feed",
        lastPost: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        isUserSource: false,
      },
      {
        id: 4,
        url: "https://podcast.example.com/rss",
        lastPost: null,
        isUserSource: false,
      },
      {
        id: 5,
        url: "https://tech.example.io/feed",
        lastPost: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        isUserSource: false,
      },
      {
        id: 6,
        url: "https://daily.example.co/rss",
        lastPost: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        isUserSource: false,
      },
    ],
    []
  );

  const placeholderPosts = useMemo(
    () => [
      {
        id: 101,
        title: "First Post Title",
        url: "https://example.com/post1",
        postdate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        description:
          "<p>This is the content of the first post. It can contain <b>HTML</b> formatting.</p>",
        userId: "user123",
        isUserPost: true,
      },
      {
        id: 102,
        title: "Second Post with a Longer Title to Test Wrapping",
        url: "https://example.com/post2",
        postdate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        description:
          "<p>Content of the second post with more details and information.</p><p>This has multiple paragraphs.</p>",
        userId: "user123",
        isUserPost: true,
      },
      {
        id: 103,
        title: "Third Post from Another User",
        url: "https://example.com/post3",
        postdate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description:
          "<p>This is a post from another user's feed that you can see because the system shows all sources.</p>",
        userId: "user456",
        isUserPost: false,
      },
      {
        id: 104,
        title: "Fourth Post Also Not Yours",
        url: "https://example.com/post4",
        postdate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        description:
          "<p>This is another post from a source you don't follow, showcasing the system's ability to display all content.</p>",
        userId: "user789",
        isUserPost: false,
      },
    ],
    []
  );

  // Use placeholder data if no real data
  useEffect(() => {
    if (loading && sources.length === 0) {
      setSources(placeholderSources);
      setLoading(false);
    }
  }, [loading, sources.length, placeholderSources]);

  // Set placeholder posts when a source is selected (until we have real API)
  useEffect(() => {
    if (selectedSource && posts.length === 0) {
      setPosts(placeholderPosts);
    }
  }, [selectedSource, posts.length, placeholderPosts]);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-4">
        <nav className="flex mb-6 border-b pb-4">
          <Link
            href="/admin"
            className="px-4 py-2 text-gray-600 hover:text-blue-600"
          >
            Stats
          </Link>
          <Link
            href="/dashboard/prolific-sources"
            className="px-4 py-2 text-gray-600 hover:text-blue-600"
          >
            Analysis
          </Link>
          <Link
            href="/dashboard/navigate"
            className="px-4 py-2 text-blue-600 font-medium border-b-2 border-blue-600"
          >
            Navigate
          </Link>
        </nav>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Content Navigator
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* First column: Sources */}
          <div className="border-r border-gray-200 h-[70vh] overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-semibold text-gray-700">All Sources</h2>
              <p className="text-xs text-gray-500 mt-1">
                Sources with "Yours" badge are in your feed
              </p>
            </div>
            <div className="overflow-y-auto flex-grow">
              {sources.map((source) => (
                <div
                  key={source.id}
                  onClick={() => setSelectedSource(source.id)}
                  className={`p-3 border-b border-gray-100 cursor-pointer ${
                    selectedSource === source.id
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <div className="font-medium text-gray-700">
                      {getSourceDomain(source.url)}
                    </div>
                    {source.isUserSource && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-sm">
                        Yours
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-xs text-gray-500 truncate">
                      {source.url}
                    </div>
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                      {formatDate(source.lastPost)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Second column: Posts */}
          <div className="border-r border-gray-200 h-[70vh] overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-semibold text-gray-700">Posts</h2>
            </div>
            <div className="overflow-y-auto flex-grow">
              {!selectedSource ? (
                <div className="p-6 text-center text-gray-500">
                  Select a source to view posts
                </div>
              ) : posts.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No posts available
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className={`p-3 border-b border-gray-100 cursor-pointer ${
                      selectedPost?.id === post.id
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium text-gray-800">
                      {post.title}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-gray-500">
                        {formatDate(post.postdate)}
                      </div>
                      {post.isUserPost && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-sm">
                          Your Feed
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Third column: Content */}
          <div className="h-[70vh] overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-semibold text-gray-700">Content</h2>
            </div>
            <div className="overflow-y-auto flex-grow">
              {!selectedPost ? (
                <div className="p-6 text-center text-gray-500">
                  Select a post to view content
                </div>
              ) : (
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {selectedPost.title}
                  </h3>
                  <div className="text-sm text-gray-500 mb-4 flex items-center">
                    <span>{formatDate(selectedPost.postdate)}</span>
                    <span className="mx-2">•</span>
                    <a
                      href={selectedPost.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Original
                    </a>
                  </div>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: selectedPost.description,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
