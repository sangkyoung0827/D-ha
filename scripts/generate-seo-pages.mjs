import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "site.config.json"), "utf8"));
const publicDir = path.join(root, "public");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const nav = [
  ["/about", "소개"], ["/dog", "강아지"], ["/cat", "고양이"],
  ["/pet-health", "펫 헬스"], ["/dha", "DHA"], ["/app", "앱 설치"]
];

const verificationTags = [
  ["google-site-verification", process.env.VITE_GOOGLE_SITE_VERIFICATION],
  ["naver-site-verification", process.env.VITE_NAVER_SITE_VERIFICATION]
].filter(([, value]) => value).map(([name, value]) => `<meta name="${name}" content="${escapeHtml(value)}">`).join("\n    ");

function pageHtml(page) {
  const canonical = `${config.origin}${page.path}`;
  const sections = page.sections.map(([heading, copy]) => `<article><span aria-hidden="true">✦</span><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(copy)}</p></article>`).join("\n          ");
  const pageJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: config.brand, url: config.origin }
  });

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta name="theme-color" content="${config.themeColor}">
    <meta name="application-name" content="Diha">
    <meta name="apple-mobile-web-app-title" content="Diha">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" href="/icon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/app.webmanifest">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${config.origin}/pwa-512x512.png">
    <meta property="og:site_name" content="Diha">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(page.title)}">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
    <meta name="twitter:image" content="${config.origin}/pwa-512x512.png">
    ${verificationTags ? `${verificationTags}\n    ` : ""}<script type="application/ld+json">${pageJsonLd}</script>
    <style>
      :root{font-family:Inter,Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#173f49;background:#eef8f4}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 5%,#fff3c8 0,transparent 24rem),linear-gradient(150deg,#e0f5ee,#fffaf0 64%);min-height:100vh}a{color:inherit}.site-header{display:flex;align-items:center;justify-content:space-between;gap:20px;max-width:1080px;margin:auto;padding:22px 24px}.brand{display:flex;align-items:center;gap:11px;text-decoration:none;font-weight:900}.brand img{width:42px;height:42px;border-radius:13px}.brand span{display:grid}.brand small{color:#43807e;font-size:11px;letter-spacing:.08em}.site-nav{display:flex;gap:16px;flex-wrap:wrap}.site-nav a{font-size:13px;font-weight:750;text-decoration:none}.site-nav a:hover{text-decoration:underline}.hero{max-width:1080px;margin:34px auto 0;padding:68px 54px;border:1px solid rgba(17,112,118,.12);border-radius:38px;background:rgba(255,255,255,.76);box-shadow:0 30px 70px rgba(20,78,78,.12);backdrop-filter:blur(18px)}.eyebrow{margin:0 0 13px;color:#168d88;font-size:12px;font-weight:900;letter-spacing:.18em}.hero h1{max-width:790px;margin:0;font-size:clamp(38px,7vw,74px);line-height:1.03;letter-spacing:-.06em}.lead{max-width:720px;margin:24px 0 0;color:#557373;font-size:18px;line-height:1.75}.cta-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:30px}.cta{display:inline-flex;min-height:50px;align-items:center;padding:0 22px;border-radius:16px;background:#0f8187;color:white;font-weight:850;text-decoration:none;box-shadow:0 12px 25px rgba(15,129,135,.2)}.cta.secondary{border:1px solid #bad8d2;background:#edf7f2;color:#215a60;box-shadow:none}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1080px;margin:20px auto;padding:0}.cards article{padding:26px;border:1px solid rgba(17,112,118,.1);border-radius:25px;background:rgba(255,255,255,.72)}.cards span{color:#e1aa38}.cards h2{margin:9px 0 7px;font-size:21px}.cards p{margin:0;color:#607b7c;line-height:1.7}.site-footer{display:flex;justify-content:space-between;gap:18px;max-width:1080px;margin:32px auto 0;padding:28px 24px 44px;color:#637c7d;font-size:12px}.site-footer nav{display:flex;gap:14px;flex-wrap:wrap}@media(max-width:720px){.site-header{align-items:flex-start}.site-nav{justify-content:flex-end;gap:9px}.site-nav a:nth-child(-n+3){display:none}.hero{margin:15px 12px 0;padding:45px 24px;border-radius:28px}.hero h1{font-size:42px}.lead{font-size:16px}.cards{grid-template-columns:1fr;margin:12px;padding:0}.site-footer{margin:16px 0 0;flex-direction:column}}
    </style>
  </head>
  <body>
    <header class="site-header"><a class="brand" href="/"><img src="/icon.svg" alt="Diha 아이콘"><span>Diha<small>디지털 펫 헬스</small></span></a><nav class="site-nav" aria-label="공개 페이지">${nav.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}</nav></header>
    <main>
      <section class="hero">
        <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
        <h1>${escapeHtml(page.heading)}</h1>
        <p class="lead">${escapeHtml(page.lead)}</p>
        <div class="cta-row"><a class="cta" href="/?source=${page.path.slice(1)}">Diha 시작하기</a>${page.path === "/app" ? '<a class="cta secondary" href="#install-guide">설치 방법 보기</a>' : '<a class="cta secondary" href="/app">앱 설치 안내</a>'}</div>
      </section>
      <section class="cards" ${page.path === "/app" ? 'id="install-guide"' : ""}>
          ${sections}
      </section>
    </main>
    <footer class="site-footer"><span>© 2026 Diha · 디하</span><nav><a href="/privacy">개인정보 안내</a><a href="/terms">이용 안내</a><a href="/support">도움말</a><a href="/sitemap.xml">사이트맵</a></nav></footer>
  </body>
</html>`;
}

for (const page of config.pages) {
  await writeFile(path.join(publicDir, `${page.path.slice(1)}.html`), pageHtml(page), "utf8");
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${config.origin}/</loc></url>
${config.pages.map((page) => `  <url><loc>${config.origin}${page.path}</loc></url>`).join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /__/

Sitemap: ${config.origin}/sitemap.xml
`;

await Promise.all([
  writeFile(path.join(publicDir, "sitemap.xml"), sitemap, "utf8"),
  writeFile(path.join(publicDir, "robots.txt"), robots, "utf8")
]);
