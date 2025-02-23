"use client";

import { useState } from "react";
import { pesos_items } from "@prisma/client";
import { format } from "date-fns";

interface PostContentProps {
  post: pesos_items;
}

export function PostContent({ post }: PostContentProps) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto relative pt-16 px-4">
        {/* About Button */}
        <button
          onClick={() => setShowAbout(!showAbout)}
          className="text-xs absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-200 text-gray-900 py-2 px-4 rounded-full flex items-center gap-2 hover:bg-gray-900 hover:text-white transition-all"
        >
          What is PESOS?
        </button>

        {/* About Screen */}
        {showAbout && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 animate-slide-down">
            <p className="text-gray-800 text-center max-w-md">
              PESOS (Publish Elsewhere, Syndicate on Own Site) is a way to own
              your content while still participating in other platforms.
            </p>
            <button
              onClick={() => setShowAbout(false)}
              className="mt-4 text-white bg-black rounded-full text-sm px-3 py-1"
            >
              Got it!
            </button>
          </div>
        )}

        <article>
          <div className="py-4">
            <div className="flex p-4 mb-2">
              <div>
                <header className="flex flex-col">
                  <time
                    dateTime={post.postdate.toString()}
                    className="flex items-center font-lighter order-first text-xs uppercase text-gray-600"
                  >
                    {format(
                      new Date(post.postdate),
                      "MMMM d, yyyy 'at' h:mm a"
                    )}
                  </time>
                  <h1 className="mt-2 text-5xl font-black tracking-tight text-gray-900">
                    {post.title}
                  </h1>
                </header>
                <div className="mt-8">
                  <div
                    className="prose prose-slate prose-lg lg:prose-xl max-w-none !space-y-6 [&>p+p]:mt-10 [&>h2]:mt-16 [&>h3]:mt-16 [&>h4]:mt-16 [&>h2+p]:mt-6 [&>h3+p]:mt-6 [&>h4+p]:mt-6 [&>ul]:mt-8 [&>ol]:mt-8 [&>blockquote]:mt-10 [&>pre]:mt-10 [&>*]:bg-white"
                    dangerouslySetInnerHTML={{ __html: post.description || "" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
