import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "site.config.json"), "utf8"));
const urlList = [config.origin, ...config.pages.map((page) => `${config.origin}${page.path}`)];
const payload = {
  host: new URL(config.origin).host,
  key: config.indexNowKey,
  keyLocation: `${config.origin}/${config.indexNowKey}.txt`,
  urlList
};

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload)
});

if (!response.ok) {
  throw new Error(`IndexNow submission failed: ${response.status} ${await response.text()}`);
}

console.log(`IndexNow accepted ${urlList.length} Diha URLs (${response.status}).`);
