import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Tracing root includes ../core, so Next puts this app under standalone/web.
const app = resolve(".next/standalone/web");
if (!existsSync(resolve(app, "server.js"))) {
  throw new Error("Run next build first; standalone/web/server.js is missing.");
}
cpSync("public", resolve(app, "public"), { recursive: true });
cpSync(".next/static", resolve(app, ".next/static"), { recursive: true });
console.log("Standalone app ready: node .next/standalone/web/server.js");
