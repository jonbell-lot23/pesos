<div className="relative flex items-center gap-4 mb-2">
  <div className="relative flex-grow">
    <Input
      type="url"
      placeholder="Enter RSS feed URL"
      value={newFeedUrl}
      onChange={(e) => setNewFeedUrl(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && newFeedUrl.trim()) {
          // Compute the new feeds array based on the current state
          const newFeeds = [
            ...feeds,
            {
              id: String(feeds.length + 1),
              url: newFeedUrl,
              status: "idle",
            },
          ];
          setFeeds(newFeeds);

          // Update the browser URL with the new feeds query string
          const newFeedUrls = newFeeds.map((feed) => feed.url).filter(Boolean);
          const queryString = newFeedUrls
            .map((url) => `feedUrls=${encodeURIComponent(url)}`)
            .join("&");
          window.history.replaceState(null, "", `?${queryString}`);

          // Automatically load posts after adding the new feed.
          fetchFeedData(newFeedUrls);
          setNewFeedUrl("");
        }
      }}
      className="font-mono pr-24 bg-white"
    />
  </div>
</div>;
