import { expect, test, type Page } from "@playwright/test";

async function createKeeper(page: Page, name = "마루") {
  await page.goto("/?debug=1");
  await expect(page).toHaveTitle(/D ha · 디하/);
  await expect(page.getByRole("img", { name: "선글라스를 쓰고 손을 흔들며 인사하는 알약 디하" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("안녕!");
  await page.getByRole("button", { name: "디하 시작하기" }).click();
  await page.getByLabel("캐릭터 이름").fill(name);
  await page.getByTestId("appearance-cocoa").click();
  await page.getByTestId("appearance-bun").click();
  await page.getByTestId("appearance-silver").click();
  await page.getByTestId("appearance-round").click();
  await expect(page.getByTestId("character-preview")).toHaveAttribute("data-skin-tone", "cocoa");
  await expect(page.getByTestId("character-preview")).toHaveAttribute("data-hair-style", "bun");
  await expect(page.getByTestId("character-preview")).toHaveAttribute("data-hair-color", "silver");
  await expect(page.getByTestId("character-preview")).toHaveAttribute("data-glasses-style", "round");
  await expect(page.getByText("기본 복장 · 흰 반팔 + 청바지")).toBeVisible();
  await page.getByRole("button", { name: "이 모습으로 시작" }).click();
  await expect(page.getByText("돌보고, 놀고,")).toBeVisible();
  await page.getByRole("button", { name: /Home 입장/ }).click();
  await expect(page.getByTestId("game-shell")).toBeVisible();
  await expect(page.locator(".phaser-host")).toHaveAttribute("aria-label", /코코아, 번, 실버 머리, 라운드/);
}

async function goToRoom(page: Page, room: string) {
  await page.getByRole("navigation", { name: "방 이동" }).getByRole("button", { name: new RegExp(room) }).click();
}

async function clickGamePoint(page: Page, x: number, y: number) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("게임 캔버스 좌표를 찾지 못했습니다.");
  const scale = Math.min(box.width / 390, box.height / 700);
  const offsetX = (box.width - 390 * scale) / 2;
  const offsetY = (box.height - 700 * scale) / 2;
  await page.mouse.click(box.x + offsetX + x * scale, box.y + offsetY + y * scale);
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("캐릭터 생성부터 돌봄, 미니게임, 구매, 장착과 새로고침 저장까지", async ({ page }) => {
  await createKeeper(page);
  await expect(page.getByText("마루", { exact: true })).toBeVisible();

  await goToRoom(page, "주방");
  await page.waitForTimeout(320);
  await clickGamePoint(page, 65, 218);
  await expect(page.getByTestId("fridge-overlay")).toBeVisible();
  await expect(page.locator(".fridge-grid > button")).toHaveCount(9);
  await expect(page.getByTestId("fridge-food-sea-bowl").getByText("×3")).toBeVisible();
  await page.getByTestId("fridge-food-sea-bowl").click();
  await expect(page.getByTestId("fridge-food-sea-bowl").getByText("×2")).toBeVisible();
  await expect(page.locator(".toast")).toContainText("돌봄");
  await page.getByLabel("닫기").click();

  await goToRoom(page, "욕실");
  await page.getByTestId("wash-button").click();
  await expect(page.locator(".toast")).toContainText("돌봄");

  await goToRoom(page, "침실");
  await page.getByTestId("sleep-button").click();
  await expect(page.locator(".toast")).toContainText("돌봄");

  await goToRoom(page, "바다");
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByTestId("start-beach-volleyball").click();
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
  await page.getByText("DEV", { exact: true }).click();
  await page.getByRole("button", { name: "설정 열기" }).click();

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
  await expect(page.locator(".status-shell .need-indicator")).toHaveCount(4);
  for (const label of ["밥", "영양제", "운동", "에너지"]) await expect(page.locator(`.need-indicator[aria-label^="${label} "]`)).toHaveCount(1);
  const before = await page.locator(".need-indicator").first().getAttribute("aria-label");
  await page.getByText("DEV", { exact: true }).click();
  await page.getByTestId("advance-1h").click();
  const after = await page.locator(".need-indicator").first().getAttribute("aria-label");

  expect(after).not.toBe(before);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const renderQuality = await page.locator("canvas").evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    return { width: canvas.width, height: canvas.height, expectedScale: Math.min(2, window.devicePixelRatio || 1) };
  });
  expect(renderQuality.width).toBe(Math.round(390 * renderQuality.expectedScale));
  expect(renderQuality.height).toBe(Math.round(700 * renderQuality.expectedScale));
});

test("일곱 공간 내비게이션과 Home 전용 간결한 화면 구성을 사용한다", async ({ page }) => {
  await createKeeper(page, "공간이");
  const navigation = page.getByRole("navigation", { name: "방 이동" });
  await expect(navigation.getByRole("button")).toHaveCount(7);
  await expect(navigation.locator("svg")).toHaveCount(7);
  await expect(navigation.getByRole("button", { name: /상점/ })).toHaveCount(0);

  await expect(page.locator(".room-studio .context-tray")).toHaveCount(0);
  const rooms = [
    ["주방", "Kitchen"],
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

test("Home에서 Kitchen을 거쳐 Ocean으로 이동하면 실제 배경 장면이 순서대로 교체된다", async ({ page }) => {
  await createKeeper(page, "장면검사");
  const canvas = page.locator("canvas");
  const homeFrame = await canvas.screenshot();

  await goToRoom(page, "주방");
  await expect(page.locator(".room-kitchen .room-heading h1")).toHaveText("Kitchen");
  await page.waitForTimeout(320);
  const kitchenFrame = await canvas.screenshot();

  await goToRoom(page, "바다");
  await expect(page.locator(".room-wellness .room-heading h1")).toHaveText("Ocean");
  await page.waitForTimeout(320);
  const oceanFrame = await canvas.screenshot();

  expect(homeFrame.equals(kitchenFrame)).toBe(false);
  expect(kitchenFrame.equals(oceanFrame)).toBe(false);
  expect(homeFrame.equals(oceanFrame)).toBe(false);
});

test("Ocean Games 보드는 일곱 게임을 보여주고 생태 구간을 순서대로 연다", async ({ page }) => {
  await createKeeper(page, "파도");
  await goToRoom(page, "바다");
  const beachAsset = await page.request.get("/assets/ocean-beach-photoreal-v1.jpg");
  expect(beachAsset.ok()).toBe(true);
  expect(beachAsset.headers()["content-type"]).toContain("image/jpeg");

  const hub = page.getByRole("complementary", { name: "Ocean 빠른 메뉴" });
  const gamesButton = hub.getByRole("button", { name: "Games", exact: true });
  const roadButton = hub.getByRole("button", { name: "해안도로", exact: true });
  await expect(gamesButton).toBeVisible();
  await expect(hub.getByRole("button", { name: "상점", exact: true })).toBeVisible();
  await expect(roadButton).toBeVisible();
  await expect(page.locator(".ocean-explore-drawer")).toHaveCount(0);

  await gamesButton.click();
  await expect(page.getByRole("region", { name: "Games 선택" })).toBeVisible();
  await expect(page.locator(".ocean-games-grid > button")).toHaveCount(7);
  await expect(page.getByTestId("start-beach-volleyball")).toBeEnabled();
  await expect(page.getByTestId("start-open-water-catch")).toBeDisabled();

  await page.getByTestId("start-beach-volleyball").click();
  await page.getByRole("button", { name: "데모 완료" }).click();
  await page.getByTestId("claim-reward").click();
  await gamesButton.click();
  await expect(page.getByTestId("start-open-water-catch")).toBeEnabled();

  await page.getByTestId("start-open-water-catch").click();
  await page.getByRole("button", { name: "데모 완료" }).click();
  await page.getByTestId("claim-reward").click();
  await expect(page.locator(".toast")).toContainText("게임 속 DHA");

  for (const gameId of ["reef-surf", "cave-sonar", "deepsea-descent"] as const) {
    await gamesButton.click();
    await expect(page.getByTestId(`start-${gameId}`)).toBeEnabled();
    await page.getByTestId(`start-${gameId}`).click();
    await page.getByRole("button", { name: "데모 완료" }).click();
    await page.getByTestId("claim-reward").click();
  }

  await roadButton.click();
  await expect(roadButton).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".ocean-explore-drawer")).toHaveCount(0);
});

test("탁구 랠리와 축구 승부차기는 컴퓨터 상대와 실제 조작으로 진행된다", async ({ page }) => {
  await createKeeper(page, "플레이어");
  await goToRoom(page, "바다");
  const gamesButton = page.getByRole("button", { name: "Games", exact: true });

  await gamesButton.click();
  await page.getByTestId("start-beach-pingpong").click();
  const action = page.getByTestId("minigame-action");
  const liveScore = page.getByTestId("minigame-live-score");
  await expect(action).toHaveText("탁구공 치기");
  await expect(liveScore).toContainText("내 점수 0, 나 0, 컴퓨터 0");
  await expect(async () => {
    await action.click();
    expect(await liveScore.textContent()).not.toContain("내 점수 0");
  }).toPass({ timeout: 8_000, intervals: [100, 120, 140] });
  await page.getByRole("button", { name: "데모 완료" }).click();
  await page.getByTestId("claim-reward").click();

  await gamesButton.click();
  await page.getByTestId("start-beach-football").click();
  await expect(action).toHaveText("슛");
  await action.click();
  await expect(liveScore).not.toContainText("내 점수 0, 나 0, 컴퓨터 0");

  await goToRoom(page, "주방");
  await expect(page.locator(".minigame-controls")).toHaveCount(0);
  await expect(page.locator(".room-kitchen .context-tray > strong")).toHaveText("Kitchen");
  await expect(page.getByRole("navigation", { name: "방 이동" }).getByRole("button", { name: /주방/ })).toHaveAttribute("aria-current", "page");
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
