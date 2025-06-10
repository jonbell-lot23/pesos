import React from "react";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:block w-60 bg-gray-50 border-r p-6">
        <h2 className="text-lg font-bold mb-4">Setup Steps</h2>
        <ol className="space-y-2">
          <li>1. Choose Username</li>
          <li>2. Add Feeds</li>
          <li>3. Complete</li>
        </ol>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
