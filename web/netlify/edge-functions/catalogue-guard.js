// Netlify enforces this before origin compute. Keep this pass-through free of
// database calls, cookies, response mutations and application-level counters.
export default function catalogueGuard() {}

export const config = {
  path: [
    "/api/search", "/api/discover", "/api/provider", "/api/games",
    "/api/episodes", "/api/trailer", "/api/books", "/api/comics",
    "/api/anime-episode", "/api/random", "/api/memory-search",
  ],
  rateLimit: {
    windowLimit: 120,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
