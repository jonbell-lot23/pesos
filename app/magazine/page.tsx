"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

// Interfaces for our data model
interface Post {
  id: number;
  title: string;
  url: string;
  slug: string;
  description: string | null;
  excerpt?: string;
  postdate: string;
  userId: string;
  sourceId: number;
  username: string;
  imageUrl?: string | null;
  relativeTime: string;
  sourceName?: string;
  cardSize?: "small" | "medium" | "large";
  aiSummary?: string;
}

interface ProlificSource {
  sourceId: number;
  sourceName: string;
  sourceUrl: string | null;
  postCount: number;
  posts: Post[];
}

interface EditorialSection {
  type: string;
  title?: string;
  sourceId?: number;
  sourceName?: string;
  sourceUrl?: string | null;
  content: string | null;
  aiContent?: string;
  posts?: Post[];
  featuredPosts?: Post[];
  postCount?: number;
}

interface DayGroup {
  date: string;
  formattedDate: string;
  posts: Post[];
}

interface MagazineContent {
  publishDate: string;
  timeRange: string;
  totalSources: number;
  totalPosts: number;
  totalUsers: number;
  featuredPosts: Post[];
  editorialSections: EditorialSection[];
  dayGroups: DayGroup[];
  prolificSources: ProlificSource[];
}

// Utility function to extract text from HTML
const stripHtml = (html: string | null): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "");
};

export default function MagazinePage() {
  const [magazineContent, setMagazineContent] =
    useState<MagazineContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const fetchMagazineContent = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use a random value to bypass cache
      const timestamp = Date.now();
      const response = await fetch(
        `/api/magazine-content?days=${days}&skipCache=true&t=${timestamp}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch magazine content: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Log first few summaries to help with debugging
      if (data.featuredPosts && data.featuredPosts.length > 0) {
        console.log(
          "Featured post summaries:",
          data.featuredPosts.map((p: Post) => p.aiSummary || "No summary")
        );
      }

      // Check if we're getting summaries on all posts
      const allSummaries = [
        ...(data.featuredPosts || []),
        ...(data.editorialSections?.[0]?.posts || []),
      ].map((p) => p.aiSummary);

      console.log(
        `Found ${allSummaries.length} posts, ${
          allSummaries.filter(Boolean).length
        } with summaries`
      );

      // Add random key to force re-render even if data is from cache
      data.renderKey = Math.random();

      setMagazineContent(data);
    } catch (err) {
      console.error("Error fetching magazine content:", err);
      setError("Failed to load magazine content. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMagazineContent();
  }, []);

  // Masonry card component with local storage for summaries
  const MasonryCard = ({ post }: { post: Post }) => {
    const cardHeightClass = "min-h-[300px]";

    // State for locally stored summary
    const [localSummary, setLocalSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
    const [fetchAttempted, setFetchAttempted] = useState<boolean>(false);

    // Function to fetch summary from the API
    const fetchSummaryFromAPI = async () => {
      if (fetchAttempted) return; // Only try once

      try {
        setFetchAttempted(true);
        setSummaryLoading(true);

        // Get excerpt from the post for better summary
        const excerpt = post.excerpt || "";

        // Simple fetch to get summary using title, postId, and content if available
        const url = new URL("/api/get-summary", window.location.origin);
        url.searchParams.append("title", post.title);
        url.searchParams.append("postId", post.id.toString());

        // Add excerpt as content if we have it
        if (excerpt) {
          url.searchParams.append("content", excerpt);
        }

        const response = await fetch(url.toString());

        if (response.ok) {
          const data = await response.json();
          if (data.summary) {
            console.log(
              `Received summary for post ${post.id}: ${data.summary}`
            );
            setLocalSummary(data.summary);

            // Store in local storage
            const storageKey = `summary_${post.id}_${post.title.substring(
              0,
              20
            )}`;
            localStorage.setItem(storageKey, data.summary);
          } else {
            console.warn(`No summary returned for post ${post.id}`);
          }
        } else {
          console.error("Failed to fetch summary:", await response.text());
        }
      } catch (error) {
        console.error("Error fetching summary:", error);
      } finally {
        setSummaryLoading(false);
      }
    };

    // Use effect to check local storage
    useEffect(() => {
      // Only run in browser environment
      if (typeof window !== "undefined") {
        try {
          setSummaryLoading(true);

          // Generate a consistent key based on post ID
          const storageKey = `summary_${post.id}_${post.title.substring(
            0,
            20
          )}`;

          // Check if we have a cached summary
          const savedSummary = localStorage.getItem(storageKey);

          if (savedSummary) {
            console.log("Using locally cached summary for:", post.title);
            setLocalSummary(savedSummary);
            setSummaryLoading(false);
          } else if (post.aiSummary) {
            // Store the API-provided summary
            localStorage.setItem(storageKey, post.aiSummary);
            setLocalSummary(post.aiSummary);
            setSummaryLoading(false);
          } else {
            // No summary available, attempt to fetch one
            fetchSummaryFromAPI();
          }
        } catch (e) {
          console.error("Error with local storage:", e);
          setSummaryLoading(false);
        }
      }
    }, [post.id, post.title, post.aiSummary]);

    return (
      <div
        key={post.id}
        className={`bg-white rounded-lg shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-200 p-6 border border-gray-100 break-inside-avoid mb-8 flex flex-col ${cardHeightClass}`}
      >
        {/* Source label */}
        <div className="text-xs font-medium text-blue-600 mb-3">
          {post.sourceName}
        </div>

        {/* Title with link - larger since it's the primary content */}
        <h3 className="text-2xl font-bold mb-4 hover:text-blue-600">
          <a href={`/post/${post.slug}`}>{post.title}</a>
        </h3>

        {/* Image if available with larger display */}
        {post.imageUrl && (
          <div className="mb-4 rounded-md overflow-hidden">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-auto max-h-[300px] object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* AI Summary with local storage caching */}
        <div className="border-l-4 border-blue-500 pl-4 mb-4 bg-blue-50 p-4 rounded-r flex-grow">
          <div className="flex flex-col">
            <div className="text-xs uppercase tracking-wider text-blue-700 mb-1 font-semibold">
              AI Summary
            </div>
            {summaryLoading && !localSummary && !post.aiSummary ? (
              <div className="flex justify-center items-center h-12">
                <Spinner size="small" />
              </div>
            ) : (
              <p className="text-gray-800 text-base leading-relaxed font-medium">
                {localSummary || post.aiSummary || "Summary unavailable"}
              </p>
            )}
          </div>
        </div>

        {/* Footer with metadata */}
        <div className="flex justify-between items-center text-sm text-gray-500 mt-auto pt-4 border-t border-gray-100">
          <span>
            By{" "}
            <a href={`/${post.username}/feed`} className="hover:underline">
              {post.username}
            </a>
          </span>
          <span>{post.relativeTime}</span>
        </div>
      </div>
    );
  };

  // Editorial section renderer with masonry layout
  const renderEditorialSection = (section: EditorialSection) => {
    const posts = section.posts || section.featuredPosts || [];

    return (
      <div key={section.title || section.type} className="mb-12">
        <h2 className="text-3xl font-bold mb-6 pb-2 border-b">
          {section.title ||
            (section.type === "source_spotlight"
              ? `From ${section.sourceName}`
              : "Recent Content")}
        </h2>

        {/* Editorial summary with AI enhanced content */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded shadow-sm">
          {section.content && (
            <div className="prose prose-slate max-w-none mb-3 text-gray-700">
              <p className="font-medium">{section.content}</p>
            </div>
          )}

          {section.aiContent && (
            <div className="prose prose-slate max-w-none text-gray-600 text-sm italic">
              <p>{section.aiContent}</p>
            </div>
          )}
        </div>

        {/* Masonry layout for content */}
        {posts && posts.length > 0 && (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-0">
            {posts.map((post) => (
              <MasonryCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Timeline view renderer with masonry layout
  const renderTimelineView = () => {
    if (!magazineContent || !magazineContent.dayGroups) return null;

    return (
      <div className="space-y-16">
        {magazineContent.dayGroups.map((day) => (
          <div key={day.formattedDate} className="relative">
            {/* Date header with indicator */}
            <div className="flex items-center mb-6">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0"></div>
              <h3 className="text-xl font-bold ml-3">{day.formattedDate}</h3>
            </div>

            {/* Masonry layout for the day's posts */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-0 pl-6 border-l-2 border-gray-100">
              {day.posts.map((post) => (
                <MasonryCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">PESOS Magazine</h1>
        <Button
          onClick={fetchMagazineContent}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Content
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <Spinner size="large" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      ) : magazineContent ? (
        <>
          <div className="mb-10 text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-center">
              <span>Curated content from the last 7 days</span>
              <span>•</span>
              <span>{magazineContent.totalPosts} posts</span>
              <span>•</span>
              <span>{magazineContent.totalSources} sources</span>
              <span>•</span>
              <span>{magazineContent.totalUsers} contributors</span>
              <span>•</span>
              <span>
                Generated{" "}
                {formatDistanceToNow(new Date(magazineContent.publishDate), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          {/* Featured articles in masonry layout */}
          {magazineContent.featuredPosts &&
            magazineContent.featuredPosts.length > 0 && (
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-6 pb-2 border-b">
                  Today's Picks
                </h2>
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-0">
                  {magazineContent.featuredPosts.map((post) => (
                    <MasonryCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}

          {/* Combined content view with all sections in one */}
          <div className="mb-12 space-y-16">
            {/* Editorial content view */}
            <div>
              {/* AI-generated editorial sections */}
              {magazineContent.editorialSections &&
              magazineContent.editorialSections.length > 0 ? (
                magazineContent.editorialSections.map((section) =>
                  renderEditorialSection(section)
                )
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 italic">
                    Our editors are still curating content for this period.
                    Check back later for featured selections.
                  </p>
                </div>
              )}
            </div>

            {/* Timeline view - hidden for now */}
            {/* {renderTimelineView()} */}

            {/* Prolific sources view - hidden for now */}
            {/* <div className="space-y-16 mt-16">
              <h2 className="text-3xl font-bold mb-6 pb-2 border-b">Popular Sources</h2>
              
              {magazineContent.prolificSources && magazineContent.prolificSources.length > 0 ? (
                magazineContent.prolificSources.map(source => (
                  <div key={source.sourceId} className="mb-8">
                    <div className="flex items-center justify-between mb-6 pb-2 border-b">
                      <h3 className="text-2xl font-bold">
                        {source.sourceName}
                      </h3>
                      <div className="flex items-center gap-2">
                        {source.sourceUrl && (
                          <a 
                            href={source.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Visit Source
                          </a>
                        )}
                        <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                          {source.postCount} posts
                        </span>
                      </div>
                    </div>
                    
                    {source.posts && source.posts.length > 0 ? (
                      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-0">
                        {source.posts.map(post => (
                          <MasonryCard key={post.id} post={post} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No recent posts from this source.</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 italic">
                    No prolific sources found for this period.
                  </p>
                </div>
              )}
            </div> */}
          </div>
        </>
      ) : (
        <div className="bg-yellow-50 p-8 rounded-lg text-center">
          <h2 className="text-xl font-semibold mb-2">No Recent Content</h2>
          <p className="text-gray-600">
            We couldn't find any posts from the last {days} days.
          </p>
          <p className="mt-4">
            <Button onClick={() => setDays(days + 7)}>
              Try looking back {days + 7} days
            </Button>
          </p>
        </div>
      )}
    </div>
  );
}
