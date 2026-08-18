import { expect, test, type Page } from "@playwright/test";

async function createKeeper(page: Page, name = "마루") {
  await page.goto("/?debug=1");
  await page.getByRole("button", { name: "나의 Keeper 만들기" }).click();
  await page.getByLabel("캐릭터 이름").fill(name);
  await page.getByRole("button", { name: "cocoa" }).click();
  await page.getByRole("button", { name: "bun" }).click();
  await page.getByRole("button", { name: "이 모습으로 시작" }).click();
  await expect(page.getByText("돌보고, 놀고,")).toBeVisible();
  await page.getByRole("button", { name: /Home 입장/ }).click();
  await expect(page.getByTestId("game-shell")).toBeVisible();
}

async function goToRoom(page: Page, room: string) {
  await page.getByRole("navigation", { name: "방 이동" }).getByRole("button", { name: new RegExp(room) }).click();
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("캐릭터 생성부터 돌봄, 미니게임, 구매, 장착과 새로고침 저장까지", async ({ page }) => {
  await createKeeper(page);
  await expect(page.getByText("마루", { exact: true })).toBeVisible();

  await goToRoom(page, "주방");
  await page.getByTestId("feed-food-sea-bowl").click();
  await expect(page.locator(".toast")).toContainText("돌봄");

  await goToRoom(page, "욕실");
  await page.getByTestId("wash-button").click();
  await expect(page.locator(".toast")).toContainText("돌봄");

  await goToRoom(page, "침실");
  await page.getByTestId("sleep-button").click();
  await expect(page.locator(".toast")).toContainText("돌봄");

  await goToRoom(page, "운동");
  await page.getByTestId("start-bubble-focus").click();
  await page.getByRole("button", { name: "데모 완료" }).click();
  await expect(page.getByTestId("claim-reward")).toBeVisible();
  await page.getByTestId("claim-reward").click();

  await page.getByText("DEV", { exact: true }).click();
  await page.getByRole("button", { name: "+1000 코인" }).click();
  await page.getByLabel("데모 레벨").selectOption("2");
  await page.getByText("DEV", { exact: true }).click();
  await goToRoom(page, "옷장");
  await page.getByTestId("closet-shop").click();
  await page.getByTestId("buy-top-coast").click();
  await page.getByLabel("닫기").click();

  await page.getByTestId("closet-open").click();
  await page.getByTestId("equip-top-coast").click();
  await expect(page.getByTestId("equip-top-coast")).toHaveClass(/active/);
  await page.reload();
  await expect(page.getByTestId("game-shell")).toBeVisible();
  await goToRoom(page, "옷장");
  await page.getByTestId("closet-open").click();
  await expect(page.getByTestId("equip-top-coast")).toHaveClass(/active/);
});

test("저장 JSON 내보내기와 가져오기가 검증된 데이터 경로를 사용한다", async ({ page }) => {
  await createKeeper(page, "백업이");
  await page.getByRole("button", { name: /설정/ }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-save").click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByTestId("import-save").setInputFiles(path!);
  await expect(page.getByRole("status")).toContainText("가져왔어요");
});

test("데모 시간 경과와 모바일 가로 오버플로를 검증한다", async ({ page }) => {
  await createKeeper(page, "해류");
  const before = await page.locator(".need-indicator").first().getAttribute("aria-label");
  await page.getByText("DEV", { exact: true }).click();
  await page.getByTestId("advance-1h").click();
  const after = await page.locator(".need-indicator").first().getAttribute("aria-label");

  expect(after).not.toBe(before);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("V3의 일곱 공간이 공통 내비게이션과 Context Tray를 사용한다", async ({ page }) => {
  await createKeeper(page, "공간이");
  const navigation = page.getByRole("navigation", { name: "방 이동" });
  await expect(navigation.getByRole("button")).toHaveCount(7);
  await expect(navigation.locator("svg")).toHaveCount(7);
  await expect(navigation.getByRole("button", { name: /상점/ })).toHaveCount(0);

  const rooms = [
    ["홈", "Home"],
    ["주방", "Kitchen"],
    ["바다", "Ocean Tools"],
    ["욕실", "Bath Items"],
    ["침실", "Sleep Items"],
    ["옷장", "Wardrobe"],
    ["운동", "Workout Gear"]
  ] as const;
  for (const [label, tray] of rooms) {
    await goToRoom(page, label);
    await expect(page.locator(".context-tray > strong")).toHaveText(tray);
  }
});

test("PWA manifest와 오프라인 앱 셸을 제공한다", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest/);
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);

  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("onboarding")).toBeVisible();
});
