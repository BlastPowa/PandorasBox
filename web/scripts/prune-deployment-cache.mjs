import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Turbopack's compiler cache snapshots build environment values. It is not
// needed to serve the app and must not be copied into deployed assets.
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const relative of [
  ".next/cache/turbopack",
  ".next/standalone/web/.next/cache/turbopack",
  ".netlify/.next/cache/turbopack",
]) {
  const target = path.resolve(webRoot, relative);
  if (!target.startsWith(webRoot + path.sep)) throw new Error("Invalid cache path");
  await rm(target, { recursive: true, force: true });
}
console.log("Removed disposable compiler caches from deployment output");
