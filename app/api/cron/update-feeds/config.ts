// Disable static generation for this route
export const config = {
  runtime: "edge",
  regions: ["iad1"],
  unstable_allowDynamic: ["**/node_modules/rss-parser/**"],
};
