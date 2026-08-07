// Runs automatically before every `next build` (see package.json "prebuild").
// Stamps public/sw.js with a version unique to this build so the browser
// always sees changed bytes and installs the new service worker — without
// that, sw.js content is byte-identical across deploys and the browser
// never fires `updatefound`, so the "update available" banner never shows.
const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "..", "public", "sw.js");
const sw = fs.readFileSync(swPath, "utf8");

const version =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || String(Date.now());

const stamped = sw.replace(
  /const CACHE_VERSION = ".*";/,
  `const CACHE_VERSION = "shopmae-${version}";`,
);

if (stamped === sw) {
  throw new Error("stamp-sw-version: CACHE_VERSION line not found in sw.js");
}

fs.writeFileSync(swPath, stamped);
console.log(`stamp-sw-version: CACHE_VERSION -> shopmae-${version}`);
