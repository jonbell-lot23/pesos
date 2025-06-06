import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

// Function to safely strip HTML tags and clean up content
function stripHtml(html: string): string {
  if (!html) return "";
  try {
    // First strip HTML tags
    let text = String(html).replace(/<[^>]*>?/gm, "");

    // Replace ALL HTML entities (server-side solution)
    text = text.replace(
      /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/gi,
      function (match, entity) {
        // Decode common entities
        const entities: Record<string, string> = {
          nbsp: " ",
          amp: "&",
          lt: "<",
          gt: ">",
          quot: '"',
          apos: "'",
          "8211": "-", // en dash
          "8212": "--", // em dash
          "8216": "'", // left single quote
          "8217": "'", // right single quote
          "8220": '"', // left double quote
          "8221": '"', // right double quote
          "8230": "...", // ellipsis
        };

        let decoded;

        // Handle numeric entities (decimal and hex)
        if (entity.startsWith("#")) {
          try {
            if (entity.startsWith("#x")) {
              // Hexadecimal entity
              const codePoint = parseInt(entity.slice(2), 16);
              decoded = String.fromCodePoint(codePoint);
            } else {
              // Decimal entity
              const codePoint = parseInt(entity.slice(1), 10);
              decoded = String.fromCodePoint(codePoint);
            }
          } catch (e) {
            // If conversion fails, return the original match
            decoded = match;
          }
        } else if (entities[entity]) {
          // Named entity from our list
          decoded = entities[entity];
        } else {
          // Unknown entity, leave as is
          decoded = match;
        }

        return decoded;
      }
    );

    // Clean up hashtags, mentions and special formatting
    text = text
      .replace(/#(\w+)/g, "$1") // Remove hashtag symbols
      .replace(/@(\w+)/g, "$1") // Remove @ symbols
      .replace(/--/g, "—") // Replace double hyphens with em dash
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n+/g, " ") // Replace newlines with space
      .replace(/Originally published at [^,]+ on \d+\/\d+\/\d+/g, "") // Remove "Originally published" text
      .replace(/INTRODUCTION/g, "") // Remove "INTRODUCTION" marker
      .trim(); // Trim extra whitespace

    return text;
  } catch (error) {
    console.error("Error stripping HTML:", error);
    return "";
  }
}

export async function GET(request: NextRequest) {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ summary: "" });
  }

  try {
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Summary generation logic would go here
    const summary = `Summary for: ${url}`;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json({ summary: "" });
  }
}

// Function to create summaries using the OpenAI API
async function createAISummary(openai: any, title: string, content: string) {
  // Check if OpenAI client is initialized
  if (!openai) {
    console.error("OpenAI client not initialized - API key may be missing");
    console.log("Using fallback summary generation");
    return generateFallbackSummary(title, content);
  }

  // First clean the content
  const cleanContent = stripHtml(content || "").trim();

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
}

// Generate a deterministic but reasonable summary without AI
function generateFallbackSummary(title: string, content: string): string {
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
}
