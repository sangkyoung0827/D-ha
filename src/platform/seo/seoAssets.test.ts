import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import site from "../../../site.config.json";

const projectFile = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Diha 정적 SEO 자산", () => {
  it("홈페이지에 브랜드 메타데이터와 구조화 데이터가 있다", () => {
    const html = projectFile("index.html");
    expect(html).toContain(`<title>${site.title}</title>`);
    expect(html).toContain(`<link rel="canonical" href="${site.origin}/"`);
    expect(html).toContain('"@type": "WebSite"');
    expect(html).toContain('"alternateName": ["디하", "D-ha", "D ha"]');
    expect(html).toContain('<h1 id="diha-brand-title">Diha 디하</h1>');
  });

  it.each(site.pages)("$path 공개 페이지가 고유 metadata와 실제 H1을 가진다", (page) => {
    const html = projectFile(`public/${page.path.slice(1)}.html`);
    expect(html).toContain(`<title>${page.title}</title>`);
    expect(html).toContain(`<meta name="description" content="${page.description}">`);
    expect(html).toContain(`<link rel="canonical" href="${site.origin}${page.path}">`);
    expect(html).toContain(`<h1>${page.heading}</h1>`);
  });

  it("sitemap과 robots가 공식 주소의 실제 공개 페이지만 안내한다", () => {
    const sitemap = projectFile("public/sitemap.xml");
    const robots = projectFile("public/robots.txt");
    expect(sitemap).toContain(`<loc>${site.origin}/</loc>`);
    for (const page of site.pages) expect(sitemap).toContain(`<loc>${site.origin}${page.path}</loc>`);
    expect(robots).toContain("User-agent: *\nAllow: /");
    expect(robots).toContain(`Sitemap: ${site.origin}/sitemap.xml`);
    expect(robots.split("\n")).not.toContain("Disallow: /");
  });
});
