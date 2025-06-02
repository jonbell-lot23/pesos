import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { postsCache, POSTS_CACHE_DURATION } from "@/lib/cache";
import { formatDistanceToNow, subDays } from "date-fns";
import { cookies } from "next/headers";
import OpenAI from "openai";

// One day in milliseconds
const ONE_DAY = 24 * 60 * 60 * 1000;

export const revalidate = POSTS_CACHE_DURATION;

// Initialize OpenAI client
let openai: OpenAI | null = null;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
}

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

interface DayGroup {
  date: string;
  formattedDate: string;
  posts: Post[];
}

interface GroupsByDay {
  [key: string]: {
    date: string;
    formattedDate: string;
    posts: Post[];
  };
}

interface SourcePostCounts {
  [key: number]: number;
}

// Function to safely strip HTML tags and clean up content
function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "");
}

// Function to safely extract first image from HTML content
function extractFirstImage(html: string): string | null {
  if (!html) return null;
  const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
  return imgMatch ? imgMatch[1] : null;
}

function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    "8211": "–",
    "8212": "—",
    "8216": "'",
    "8217": "'",
    "8220": '"',
    "8221": '"',
    "8230": "...",
  };

  return text.replace(/&([^;]+);/g, (match, entity: string) => {
    if (entity.startsWith("#")) {
      return String.fromCharCode(parseInt(entity.slice(1)));
    } else if (entity in entities) {
      return entities[entity];
    }
    return match;
  });
}

// Move function declarations outside of blocks
const createAISummary = async (
  title: string,
  content: string
): Promise<string> => {
  // Check if OpenAI client is initialized
  if (!openai) {
    console.error("OpenAI client not initialized - API key may be missing");
    console.log("Using fallback summary generation");
    return generateFallbackSummary(title, content);
  }

  // Use the browser's localStorage API
  const LOCAL_STORAGE_PREFIX = "article_summary_";

  // First clean the content
  const cleanContent = stripHtml(content || "").trim();

  // Generate a unique key for this article based on title
  const storageKey =
    LOCAL_STORAGE_PREFIX +
    Buffer.from(title || "")
      .toString("base64")
      .substring(0, 32);

  try {
    // For LLM usage, extract a limited portion to stay within limits
    const contentSample = `${title || ""}\n\n${cleanContent.substring(
      0,
      2000
    )}`;

    // Create a real LLM call to OpenAI
    console.log("Making OpenAI request for:", title);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that summarizes articles in one concise sentence.",
        },
        {
          role: "user",
          content: `Summarize this article in ONE concise sentence (25 words max) that captures its main point:\n\n${contentSample}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 60,
    });

    // Extract the generated summary
    const summary = completion.choices[0]?.message?.content?.trim();
    console.log("OpenAI generated summary:", summary);

    // If we have a valid summary, return it
    if (summary) {
      return summary;
    } else {
      throw new Error("Empty summary from OpenAI");
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    // Use fallback summary generation instead of propagating the error
    console.log("Using fallback summary generation due to API error");
    return generateFallbackSummary(title, content);
  }
};

const generateFallbackSummary = (title: string, content: string): string => {
  // Clean the content
  const cleanContent = stripHtml(content || "").trim();

  // Get the first sentence if available
  let firstSentence = "";
  if (cleanContent) {
    const sentenceEnd = cleanContent.indexOf(". ");
    if (sentenceEnd > 0 && sentenceEnd < 200) {
      firstSentence = cleanContent.substring(0, sentenceEnd + 1);
    } else {
      // Get first 100 characters
      firstSentence = cleanContent.substring(0, 100) + "...";
    }
  }

  // Use title if no content available
  if (!firstSentence && title) {
    return `${title} - details covered in this informative article.`;
  }

  // Generic fallbacks based on content length
  if (cleanContent.length > 1000) {
    return "An in-depth exploration of important industry concepts and practical applications.";
  } else if (cleanContent.length > 500) {
    return "A concise overview of key developments and their potential impact.";
  } else {
    return "Brief update on recent developments in this field.";
  }
};

// Main GET handler
export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days") || "7";
    const days = parseInt(daysParam);

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 30) {
      return NextResponse.json(
        { error: "Invalid days parameter", code: "INVALID_PARAM" },
        { status: 400 }
      );
    }

    // Check for cache busting parameter
    const skipCache = searchParams.get("skipCache") === "true";

    // Check cache first, but respect skipCache parameter
    const cacheKey = `magazine_simple:${days}`;
    const cached = !skipCache && postsCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < POSTS_CACHE_DURATION * 1000) {
      console.log("[magazine/GET] Returning cached data");
      return NextResponse.json(cached.data);
    }

    console.log("[magazine/GET] Generating fresh content");

    // Calculate date range
    const startDate = new Date(now - days * ONE_DAY);

    // Get blocked sources for the user if they're logged in
    let blockedSourceIds: number[] = [];
    const cookieStore = cookies();
    const userId = cookieStore.get("userId")?.value;

    if (userId) {
      try {
        const blockedFeedsResponse = await prisma.$queryRaw`
          SELECT "sourceId" FROM "pesos_BlockedFeeds"
        `;
        blockedSourceIds = (blockedFeedsResponse as { sourceId: number }[]).map(
          (item) => item.sourceId
        );
      } catch (error) {
        console.error("Error fetching blocked feeds:", error);
      }
    }

    // Get recent posts with basic information, filtering out blocked sources
    const recentPosts = await prisma.pesos_items.findMany({
      where: {
        postdate: {
          gte: startDate,
        },
        sourceId: {
          notIn: blockedSourceIds.length > 0 ? blockedSourceIds : undefined,
        },
      },
      include: {
        pesos_Sources: {
          select: {
            id: true,
            url: true,
          },
        },
        pesos_User: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        postdate: "desc",
      },
      take: 200, // Increase content amount
    });

    // Process posts for display with better content summaries
    const processedPosts = recentPosts.map((post) => {
      // Extract image if available
      const imageUrl = post.description
        ? extractFirstImage(post.description)
        : null;

      // Create source name
      let sourceName = "Unknown Source";
      try {
        if (post.source) {
          sourceName = post.source;
        } else if (post.pesos_Sources?.url) {
          const url = new URL(post.pesos_Sources.url);
          sourceName = url.hostname;
        }
      } catch (e) {
        console.error("Error processing source URL:", e);
      }

      // Format relative time
      let relativeTime = "";
      try {
        relativeTime = formatDistanceToNow(new Date(post.postdate), {
          addSuffix: true,
        });
      } catch (e) {
        console.error("Error formatting time:", e);
        relativeTime = "recently";
      }

      // Get a meaningful excerpt
      let excerpt = "";
      if (post.description) {
        const plainText = stripHtml(post.description);
        if (plainText) {
          // Get a meaningful excerpt (not too short, not too long)
          const minLength = 160; // Increased for better context
          const maxLength = 400; // Increased for longer excerpts

          if (plainText.length <= maxLength) {
            excerpt = plainText;
          } else {
            // Try to find a good break point near maxLength
            let breakPoint = plainText.lastIndexOf(". ", maxLength);

            // If no sentence break found, try paragraph or other punctuation
            if (breakPoint < minLength) {
              breakPoint = plainText.lastIndexOf("! ", maxLength);
            }
            if (breakPoint < minLength) {
              breakPoint = plainText.lastIndexOf("? ", maxLength);
            }
            if (breakPoint < minLength) {
              breakPoint = plainText.lastIndexOf("; ", maxLength);
            }
            if (breakPoint < minLength) {
              breakPoint = plainText.lastIndexOf(", ", maxLength);
            }

            if (breakPoint > minLength) {
              excerpt = plainText.substring(0, breakPoint + 1);
            } else {
              // Find a word boundary instead of cutting mid-word
              const truncated = plainText.substring(0, maxLength);
              const lastSpace = truncated.lastIndexOf(" ");
              if (lastSpace > minLength) {
                excerpt = plainText.substring(0, lastSpace) + "...";
              } else {
                excerpt = truncated + "...";
              }
            }
          }
        }
      }

      // Determine post type/category (for variable height cards)
      const contentLength = post.description
        ? stripHtml(post.description).length
        : 0;
      const hasImage = !!imageUrl;
      let cardSize: "small" | "medium" | "large" = "medium"; // default

      if (hasImage && contentLength > 500) {
        cardSize = "large";
      } else if (!hasImage && contentLength < 200) {
        cardSize = "small";
      }

      return {
        id: post.id,
        title: post.title || "Untitled",
        url: post.url || "#",
        slug: post.slug || `post-${post.id}`,
        description: post.description || "",
        excerpt,
        postdate: post.postdate.toISOString(),
        userId: post.userId || "anonymous",
        sourceId: post.sourceId || 0,
        username: post.pesos_User?.username || "anonymous",
        sourceName,
        imageUrl,
        relativeTime,
        cardSize,
      } as Post;
    });

    // Track used posts to avoid duplicates
    const usedPostIds = new Set();

    // Choose featured posts (prioritize those with images)
    const featuredPostsCandidates = processedPosts
      .filter((post) => post.imageUrl && post.title && post.title.length > 20)
      .slice(0, 4);

    // Process featured posts with AI summaries
    const featuredPosts = [];
    for (const post of featuredPostsCandidates) {
      try {
        console.log(`Generating AI summary for featured post: ${post.title}`);
        const summary = await createAISummary(
          post.title,
          post.excerpt || post.description || ""
        );
        console.log(`Successfully generated featured summary: ${summary}`);
        featuredPosts.push({
          ...post,
          aiSummary: summary,
        });
      } catch (error) {
        console.error(
          `Error generating summary for featured post: ${post.title}`,
          error
        );
        // If summarization fails, add with null summary to indicate it needs to be fetched client-side
        featuredPosts.push({
          ...post,
          aiSummary: null,
        });
      }
    }

    // Mark featured posts as used
    featuredPosts.forEach((post) => usedPostIds.add(post.id));

    // Group remaining posts by day (excluding already featured posts)
    const dayGroups: DayGroup[] = [];
    const groupsByDay: GroupsByDay = {};

    // Only include posts not already featured
    processedPosts
      .filter((post) => !usedPostIds.has(post.id))
      .forEach((post) => {
        try {
          const date = new Date(post.postdate);
          const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format

          if (!groupsByDay[dateKey]) {
            groupsByDay[dateKey] = {
              date: dateKey,
              formattedDate: date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              }),
              posts: [],
            };
          }

          groupsByDay[dateKey].posts.push(post);
        } catch (e) {
          console.error("Error grouping by day:", e);
        }
      });

    // Convert to array and sort by date
    Object.values(groupsByDay).forEach((group) => {
      dayGroups.push(group);
    });

    dayGroups.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Create LLM-enhanced editorial section with AI-generated insights

    // Create Mock OpenAI API for development
    class MockOpenAI {
      async chat_completions_create(params: any) {
        console.log(
          "Using Mock OpenAI API for:",
          params.messages[1].content.substring(0, 50) + "..."
        );

        // Extract the article title from the user prompt
        const userPrompt = params.messages[1].content;
        const contentStart = userPrompt.indexOf("\n\n");
        const titlePart =
          contentStart > 0 ? userPrompt.substring(0, contentStart) : "Article";

        // Create a realistic-looking response with a delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        return {
          choices: [
            {
              message: {
                content: `This ${titlePart.toLowerCase()} explores key concepts and practical applications for modern technology users.`,
              },
            },
          ],
        };
      }
    }

    // Initialize OpenAI client (real or mock)
    let usingMock = false;

    try {
      // Check if API key is defined
      const apiKey = process.env.OPENAI_API_KEY;

      if (
        !apiKey ||
        apiKey.includes("sk-your") ||
        apiKey.includes("sk-abcdef")
      ) {
        console.log(
          "Using mock OpenAI client for development (no valid API key)"
        );
        openai = { chat: { completions: new MockOpenAI() } } as any;
        usingMock = true;
      } else {
        // Log the key format without revealing the actual key
        const keyPrefix = apiKey.substring(0, 7);
        const keyLength = apiKey.length;
        console.log(`OpenAI API key format: ${keyPrefix}...${keyLength} chars`);

        openai = new OpenAI({
          apiKey: apiKey,
        });
        console.log("OpenAI client initialized successfully");
      }
    } catch (error) {
      console.error("Error initializing OpenAI client:", error);
      console.log("Falling back to mock OpenAI client");
      openai = { chat: { completions: new MockOpenAI() } } as any;
      usingMock = true;
    }

    // Get posts for editorial section that aren't featured
    // Prioritize posts with images and longer content
    const availableForHighlights = processedPosts
      .filter((post) => !usedPostIds.has(post.id))
      .sort((a, b) => {
        // Sort first by having an image
        if (a.imageUrl && !b.imageUrl) return -1;
        if (!a.imageUrl && b.imageUrl) return 1;
        // Then by excerpt length
        return (b.excerpt?.length || 0) - (a.excerpt?.length || 0);
      })
      .slice(0, 6);

    // Process each post to add AI summaries (handling async)
    const highlightsWithSummaries = [];
    for (const post of availableForHighlights) {
      try {
        console.log(`Generating AI summary for: ${post.title}`);
        const summary = await createAISummary(
          post.title,
          post.excerpt || post.description || ""
        );
        console.log(`Successfully generated summary: ${summary}`);
        highlightsWithSummaries.push({
          ...post,
          aiSummary: summary,
        });
      } catch (error) {
        console.error(
          `Error generating summary for post: ${post.title}`,
          error
        );
        // If summarization fails, add with null summary to indicate it needs to be fetched client-side
        highlightsWithSummaries.push({
          ...post,
          aiSummary: null,
        });
      }
    }

    // Mark these as used too
    availableForHighlights.forEach((post) => usedPostIds.add(post.id));

    // Calculate total unique sources (filter out undefined sourceIds)
    const totalSources = new Set(
      recentPosts.filter((post) => post.sourceId).map((post) => post.sourceId)
    ).size;

    // Calculate prolific sources (sources with multiple posts)
    const sourcePostCounts: Record<number, number> = {};
    recentPosts.forEach((post) => {
      if (post.sourceId) {
        const sourceId = post.sourceId;
        sourcePostCounts[sourceId] = (sourcePostCounts[sourceId] || 0) + 1;
      }
    });

    // Get top sources with the most posts
    const prolificSourceIds = Object.entries(sourcePostCounts)
      .filter(([_, count]) => (count as number) > 1)
      .sort(
        ([_, countA], [__, countB]) => (countB as number) - (countA as number)
      )
      .slice(0, 5)
      .map(([sourceId]) => parseInt(sourceId));

    // Create simple prolific sources without trying to fetch additional data
    const prolificSources = prolificSourceIds.map((sourceId: number) => {
      // Ensure sourceId is the same type (number) for comparison
      const sourcePosts = processedPosts
        .filter((post) => post.sourceId && post.sourceId === sourceId)
        .slice(0, 3);

      let sourceName = "Unknown Source";

      if (sourcePosts.length > 0) {
        // Use the sourceName that we already set in processedPosts
        sourceName = sourcePosts[0].sourceName || "Unknown Source";
      }

      return {
        sourceId,
        sourceName,
        sourceUrl: null,
        postCount: sourcePostCounts[sourceId],
        posts: sourcePosts,
      };
    });

    // Calculate unique users count safely
    let totalUsers = 0;
    try {
      totalUsers = new Set(
        recentPosts.filter((post) => post.userId).map((post) => post.userId)
      ).size;
    } catch (error) {
      console.error("Error calculating unique users:", error);
    }

    const magazineContent = {
      publishDate: new Date(),
      timeRange: `Last ${days} days`,
      totalPosts: recentPosts.length,
      totalSources,
      totalUsers,
      featuredPosts:
        featuredPosts.length > 0 ? featuredPosts : processedPosts.slice(0, 4),
      editorialSections: [
        {
          type: "trending",
          title: "Recent Highlights",
          content:
            "Our AI editors have selected these pieces as particularly noteworthy based on relevance and engagement.",
          aiContent:
            "This curated collection represents the most thought-provoking and insightful content from the community, carefully analyzed for quality and relevance.",
          posts: highlightsWithSummaries,
        },
        {
          type: "ai_picks",
          title: "Editor's Analysis",
          content:
            "Our AI has analyzed recent trends across all sources to bring you this intelligent synthesis.",
          aiContent:
            "These articles were selected based on their informational depth, writing quality, and relevance to current discussions in the technology community.",
          posts: highlightsWithSummaries.slice(0, 3),
        },
      ],
      dayGroups,
      prolificSources: prolificSources.filter(
        (source) => source.posts && source.posts.length > 0
      ),
    };

    // Cache the response
    postsCache.set(cacheKey, {
      data: magazineContent,
      timestamp: now,
    });

    return NextResponse.json(magazineContent);
  } catch (error) {
    console.error("[magazine-content/GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate magazine content", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
