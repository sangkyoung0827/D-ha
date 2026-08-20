import { expect, test } from "@playwright/test";

test("정적 브랜드 페이지는 JavaScript 없이도 metadata와 본문을 제공한다", async ({ request }) => {
  const response = await request.get("/dog");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain("<title>강아지 디지털 펫과 건강 루틴 | Diha 디하</title>");
  expect(html).toContain('<link rel="canonical" href="https://d-ha.vercel.app/dog">');
  expect(html).toContain("<h1>강아지와 함께 만드는 건강한 생활 리듬</h1>");
});

test("앱 설치 공개 페이지와 검색엔진 파일이 정상 응답한다", async ({ page, request }) => {
  await page.goto("/app");
  await expect(page).toHaveTitle("Diha 앱 설치 방법 | 디지털 펫 헬스 PWA");
  await expect(page.getByRole("heading", { level: 1, name: "Diha를 홈 화면에서 바로 만나세요" })).toBeVisible();
  await expect(page.getByText("Android와 데스크톱")).toBeVisible();
  await expect(page.getByText("iPhone과 iPad")).toBeVisible();

  const [manifest, robots, sitemap, serviceWorker, icon] = await Promise.all([
    request.get("/app.webmanifest"),
    request.get("/robots.txt"),
    request.get("/sitemap.xml"),
    request.get("/sw.js"),
    request.get("/pwa-512x512.png")
  ]);
  for (const response of [manifest, robots, sitemap, serviceWorker, icon]) expect(response.ok()).toBeTruthy();

  const manifestBody = await manifest.json();
  expect(manifestBody).toMatchObject({ name: "Diha - 디지털 펫 헬스", short_name: "Diha", display: "standalone", start_url: "/", scope: "/" });
  expect(await robots.text()).toContain("Sitemap: https://d-ha.vercel.app/sitemap.xml");
  expect(await sitemap.text()).toContain("https://d-ha.vercel.app/pet-health");
  expect((await icon.body()).byteLength).toBeGreaterThan(10_000);
});

test("원래 앱 화면에서 작은 다운로드 버튼이 네이티브 설치 창을 연다", async ({ page }) => {
  await page.goto("/");
  const downloadButton = page.getByRole("button", { name: "Diha 앱 다운로드" });
  await expect(downloadButton).toBeVisible();
  await expect(downloadButton).toContainText("앱 다운로드");

  await page.evaluate(() => {
    const installEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(installEvent, {
      prompt: {
        value: async () => {
          document.documentElement.dataset.installPromptCalled = "true";
        }
      },
      userChoice: {
        value: Promise.resolve({ outcome: "accepted", platform: "web" })
      }
    });
    window.dispatchEvent(installEvent);
  });

  await downloadButton.click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.installPromptCalled)).toBe("true");
  await expect(downloadButton).toBeHidden();
});
