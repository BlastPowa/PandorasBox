import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { AsyncLocalStorage } from "node:async_hooks";

const require = createRequire(import.meta.url);
const ts = require("typescript");
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const { unstable_doesMiddlewareMatch } = require("next/experimental/testing/server");
function load(path, mocks, extra = "") {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, "utf8") + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, require: (name) => mocks[name], Date, Map, Math, process, Headers, Response, AbortSignal,
  });
  return exports;
}
const NextResponse = { json: (value, options) => Response.json(value, options) };
const { publicCatalogJson } = load("lib/public-cache.ts", { "next/server": { NextResponse } });
assert.equal(publicCatalogJson({ results: [] }).headers.get("Vercel-CDN-Cache-Control"),
  "public, s-maxage=900, stale-while-revalidate=3600");

const { rateLimit, tooManyRequests, size } = load("lib/rate-limit.ts",
  { "next/server": { NextResponse } }, "\nexport const size = () => store.size;");
const req = { headers: new Headers({ "x-forwarded-for": "1.2.3.4" }) };
assert(rateLimit(req, "test", 2).ok);
assert(rateLimit(req, "test", 2).ok);
const denied = rateLimit(req, "test", 2);
assert.equal(denied.ok, false);
assert.equal(tooManyRequests(denied).status, 429);
assert.equal(tooManyRequests(denied).headers.get("cache-control"), "private, no-store");
for (let i = 0; i < 10000; i++) {
  rateLimit({ headers: new Headers({ "x-forwarded-for": `client-${i}` }) }, "stress", 2);
}
assert(size() <= 5000, "unique client addresses must not cause unbounded memory growth");

const { config } = load("proxy.ts", {
  "next/server": {}, "@supabase/ssr": {}, "@/lib/supabase/env": {},
});
for (const url of ["/api/search?q=test", "/api/messages", "/auth/callback",
  "/downloads/extension.zip", "/sw.js", "/_next/static/a.js", "/icons/icon-192.png"]) {
  assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), false, url);
}
for (const url of ["/login", "/library?status=planned", "/profile/name.test", "/browse"]) {
  assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), true, url);
}
console.log("PASS: shared catalogue cache, uncached 429s, bounded limiter and Next proxy matching");
