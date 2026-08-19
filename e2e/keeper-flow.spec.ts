import { expect, test, type Page } from "@playwright/test";

async function createPet(page: Page, name = "마루") {
  await page.goto("/?debug=1");
  await expect(page).toHaveTitle(/D ha · 디하/);
  await expect(page.getByRole("img", { name: "선글라스를 쓰고 손을 흔들며 인사하는 알약 디하" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("안녕!");
  await page.getByRole("button", { name: "디하 시작하기" }).click();
  const nameInput = page.getByLabel("반려동물 이름");
  await nameInput.fill(name);
  const focusStyle = await nameInput.evaluate((input) => {
    const inputStyle = getComputedStyle(input);
    const labelStyle = getComputedStyle(input.closest("label")!);
    return { inputOutline: inputStyle.outlineStyle, inputShadow: inputStyle.boxShadow, labelOutline: labelStyle.outlineStyle };
  });
  expect(focusStyle.inputOutline).toBe("none");
  expect(focusStyle.labelOutline).toBe("none");
  expect(focusStyle.inputShadow).not.toBe("none");
  await page.getByRole("button", { name: "🐱 고양이" }).click();
  await page.getByTestId("pet-breed-siamese").click();
  await page.getByTestId("pet-option-seal").click();
  await page.getByTestId("pet-option-points").click();
  await page.getByTestId("pet-option-coral").click();
  await page.getByTestId("pet-option-cap").click();
  await page.getByTestId("pet-option-sunglasses").click();
  await page.getByTestId("pet-option-sailor").click();
  await expect(page.getByTestId("pet-preview")).toHaveAttribute("data-species", "cat");
  await expect(page.getByTestId("pet-preview")).toHaveAttribute("data-breed", "siamese");
  await expect(page.getByTestId("pet-preview")).toHaveAttribute("data-fur-color", "seal");
  await expect(page.getByTestId("pet-preview")).toHaveAttribute("data-accessory", "sunglasses");
  await expect(page.getByTestId("pet-preview")).toHaveAttribute("data-outfit", "sailor");
  await page.getByRole("button", { name: "이 모습으로 시작" }).click();
  await expect(page.getByTestId("account-gate")).toBeVisible();
  await expect(page.getByText("계정별 독립 저장")).toBeVisible();
  await page.getByRole("button", { name: "Google로 계속" }).click();
  await expect(page.getByText("함께 살고, 돌보고,")).toBeVisible();
  await page.getByRole("button", { name: /Home 입장/ }).click();
  await expect(page.getByTestId("game-shell")).toBeVisible();
  await expect(page.getByTestId("home-pet-scene")).toHaveAttribute("data-species", "cat");
  await expect(page.getByTestId("home-pet-scene")).toHaveAttribute("data-breed", "siamese");
  await expect(page.getByTestId("home-pet-avatar")).toHaveAttribute("aria-label", /샴, 씰 브라운, 포인트, 선글라스/);
}

async function goToRoom(page: Page, room: string) {
  const navigation = page.getByRole("navigation", { name: "방 이동" });
  const indoorDoors: Record<string, { id: string; heading: string }> = {
    주방: { id: "kitchen", heading: "Kitchen" },
    욕실: { id: "bathroom", heading: "Bath" },
    침실: { id: "bedroom", heading: "Sleep" },
    옷장: { id: "wardrobe", heading: "Closet" }
  };
  const indoor = indoorDoors[room];
  if (!indoor) {
    await navigation.getByRole("button", { name: new RegExp(room) }).click();
    return;
  }
  if (await page.getByTestId("home-pet-scene").count() === 0) {
    await navigation.getByRole("button", { name: /홈/ }).click();
    await expect(page.getByTestId("home-pet-scene")).toBeVisible();
  }
  await page.getByTestId(`home-static-room-${indoor.id}`).dispatchEvent("click");
  await expect(page.locator(".room-heading h1")).toHaveText(indoor.heading);
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("반려동물 생성부터 돌봄, 미니게임, 구매, 장착과 새로고침 저장까지", async ({ page }) => {
  test.slow();
  await createPet(page);
  await expect(page.getByText("마루", { exact: true }).first()).toBeVisible();

  await goToRoom(page, "주방");
  await page.getByTestId("open-fridge").click();
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
  await page.getByTestId("start-ocean-run").click();
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
  await createPet(page, "백업이");
  await page.getByText("DEV", { exact: true }).click();
  await page.getByRole("button", { name: "설정 열기" }).click();
  await expect(page.getByTestId("settings-account")).toContainText("player@example.com");

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-save").click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const importInput = page.getByTestId("import-save");
  await importInput.setInputFiles(path!);
  await expect(importInput).toHaveValue("");
  await expect(page.getByTestId("settings-account")).toContainText("player@example.com");
  await expect(page.getByText("백업이", { exact: true }).first()).toBeVisible();
});

test("데모 시간 경과와 모바일 가로 오버플로를 검증한다", async ({ page }) => {
  await createPet(page, "해류");
  await expect(page.locator(".status-shell .need-indicator")).toHaveCount(4);
  for (const label of ["밥", "영양제", "운동", "에너지"]) await expect(page.locator(`.need-indicator[aria-label^="${label} "]`)).toHaveCount(1);
  const before = await page.locator(".need-indicator").first().getAttribute("aria-label");
  await page.getByText("DEV", { exact: true }).click();
  await page.getByTestId("advance-1h").click();
  const after = await page.locator(".need-indicator").first().getAttribute("aria-label");

  expect(after).not.toBe(before);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await goToRoom(page, "바다");
  const renderQuality = await page.locator("canvas").evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const bounds = canvas.getBoundingClientRect();
    return { width: canvas.width, height: canvas.height, cssWidth: bounds.width, cssHeight: bounds.height, expectedScale: Math.min(1.5, window.devicePixelRatio || 1) };
  });
  expect(renderQuality.width).toBeGreaterThanOrEqual(Math.floor(renderQuality.cssWidth * renderQuality.expectedScale));
  expect(renderQuality.height).toBeGreaterThanOrEqual(Math.floor(renderQuality.cssHeight * renderQuality.expectedScale));
});

test("하단 메뉴는 Home, Ocean, 반려동물 건강 상점으로 구성된다", async ({ page }) => {
  test.slow();
  await createPet(page, "공간이");
  const navigation = page.getByRole("navigation", { name: "방 이동" });
  await expect(navigation.getByRole("button")).toHaveCount(3);
  await expect(navigation.locator("svg")).toHaveCount(3);
  await expect(navigation.getByRole("button", { name: /운동|Workout/ })).toHaveCount(0);
  await navigation.getByRole("button", { name: /상점/ }).click();
  await expect(page.getByTestId("pet-store-overlay")).toBeVisible();
  await expect(page.getByText("패밀리 DHA 듀오")).toBeVisible();
  await expect(page.getByText("반려동물 + 사람", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "애견 건강기능식품" }).click();
  await expect(page.getByText("펫 프로바이오틱 바이트")).toBeVisible();
  await page.getByLabel("닫기").click();

  await expect(page.locator(".room-studio .context-tray")).toHaveCount(0);
  await expect(page.getByTestId("home-pet-avatar")).toBeVisible();
  await expect(page.locator(".home-pet-cushion")).toBeVisible();
  await expect(page.getByTestId("home3d-joystick")).toHaveCount(0);
  const petPlaces = page.getByRole("navigation", { name: "반려동물 장소" });
  await expect(petPlaces.getByRole("button")).toHaveCount(5);
  await expect(petPlaces.getByRole("button", { name: /동물병원/ })).toBeVisible();
  await expect(petPlaces.getByRole("button", { name: /애견 카페/ })).toBeVisible();
  await petPlaces.getByRole("button", { name: /산책로/ }).click();
  await expect(petPlaces.getByRole("button", { name: /산책로/ })).toHaveAttribute("aria-pressed", "true");
  const rooms = [
    ["주방", "Kitchen"],
    ["욕실", "Bath Items"],
    ["침실", "Sleep Items"],
    ["옷장", "Wardrobe"]
  ] as const;
  for (const [label, tray] of rooms) {
    await goToRoom(page, label);
    await expect(page.locator(".context-tray > strong")).toHaveText(tray);
    await expect(navigation.getByRole("button", { name: /홈/ })).toHaveAttribute("aria-current", "page");
  }
});

test("홈은 노란 방석 위 반려동물과 장소 메뉴만 보여준다", async ({ page }) => {
  await createPet(page, "동선이");
  await expect(page.locator(".room-studio .room-heading h1")).toHaveText("Home");
  await expect(page.getByTestId("home-pet-scene")).toBeVisible();
  await expect(page.getByTestId("home-pet-avatar")).toBeVisible();
  await expect(page.locator(".home-pet-cushion")).toBeVisible();
  await expect(page.getByTestId("home-3d-canvas")).toHaveCount(0);
  await expect(page.getByTestId("home3d-joystick")).toHaveCount(0);
  await expect(page.getByText("거실", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "동선이 쓰다듬기" }).click();
  await expect(page.getByRole("button", { name: "동선이 쓰다듬기" })).toHaveClass(/reaction-happy/);
  await page.getByRole("navigation", { name: "방 이동" }).getByRole("button", { name: /바다/ }).click();
  await expect(page.locator(".room-wellness .room-heading h1")).toHaveText("Ocean");
  await expect(page.getByRole("button", { name: "Games", exact: true })).toBeVisible();
});

test("생활 공간 다섯 곳이 고해상도 게임 배경으로 교체되고 방 이동에 맞춰 표시된다", async ({ page }) => {
  test.slow();
  await createPet(page, "장면검사");
  const canvas = page.locator("canvas");
  const roomAssets = [
    ["주방", "kitchen", "Kitchen"],
    ["욕실", "bathroom", "Bath"],
    ["침실", "bedroom", "Sleep"],
    ["옷장", "wardrobe", "Closet"]
  ] as const;
  const frames: Buffer[] = [];

  for (const [label, asset, heading] of roomAssets) {
    const response = await page.request.get(`/assets/${asset}-game-v2.jpg`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/jpeg");
    expect((await response.body()).byteLength).toBeGreaterThan(200_000);

    await goToRoom(page, label);
    await expect(page.locator(`.room-${asset === "workout" ? "game-room" : asset} .room-heading h1`)).toHaveText(heading);
    await page.waitForTimeout(360);
    const frame = await canvas.screenshot();
    if (frames.length > 0) expect(frame.equals(frames.at(-1)!)).toBe(false);
    frames.push(frame);
  }
});

test("Ocean Games는 Ocean Run과 Jump Up 두 게임만 제공한다", async ({ page }) => {
  await createPet(page, "파도");
  await goToRoom(page, "바다");
  const beachAsset = await page.request.get("/assets/ocean-beach-game-v2.jpg");
  expect(beachAsset.ok()).toBe(true);
  expect(beachAsset.headers()["content-type"]).toContain("image/jpeg");
  for (const asset of [
    "ocean-run-beach-v1.jpg",
    "ocean-run-surf-v1.jpg",
    "ocean-run-cave-v1.jpg",
    "ocean-run-deepsea-v1.jpg",
    "ocean-run-surfboard-v1.png",
    "ocean-run-palm-v1.png",
    "ocean-run-driftwood-v1.png"
  ]) {
    const response = await page.request.get(`/assets/${asset}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/^image\//);
    expect((await response.body()).byteLength).toBeGreaterThan(100_000);
  }

  const hub = page.getByRole("complementary", { name: "Ocean 빠른 메뉴" });
  const gamesButton = hub.getByRole("button", { name: "Games", exact: true });
  const roadButton = hub.getByRole("button", { name: "해안도로", exact: true });
  await expect(gamesButton).toBeVisible();
  await expect(hub.getByRole("button", { name: "상점", exact: true })).toBeVisible();
  await expect(roadButton).toBeVisible();
  await expect(page.locator(".ocean-explore-drawer")).toHaveCount(0);

  await gamesButton.click();
  await expect(page.getByRole("region", { name: "Games 선택" })).toBeVisible();
  await expect(page.locator(".ocean-game-choice")).toHaveCount(2);
  await expect(page.locator(".ocean-run-card")).toContainText("Ocean Run");
  await expect(page.locator(".jump-up-card")).toContainText("Jump Up");
  await expect(page.getByTestId("start-ocean-run")).toBeEnabled();
  await expect(page.getByTestId("start-jump-up")).toBeEnabled();
  await expect(page.getByTestId("start-beach-volleyball")).toHaveCount(0);

  await page.getByTestId("start-ocean-run").click();
  await expect(page.getByTestId("minigame-action")).toHaveText("점프 / 상승");
  await expect(page.getByTestId("minigame-live-score")).toContainText("챕터 1");
  await expect(page.getByTestId("minigame-live-score")).toContainText("DHA");
  await page.getByRole("button", { name: "DHA 저하 테스트" }).click();
  await expect(page.getByTestId("dha-vision-warning")).toBeVisible();
  await expect(page.getByTestId("minigame-live-score")).toContainText("DHA 15퍼센트");
  await page.getByRole("button", { name: "DHA 회복 테스트" }).click();
  await expect(page.getByTestId("dha-vision-warning")).toHaveCount(0);
  await expect(page.getByTestId("minigame-live-score")).toContainText("DHA 70퍼센트");
  await page.getByRole("button", { name: "데모 완료" }).click();
  await expect(page.getByText("심해 탐험 완주!")).toBeVisible();
  await page.getByTestId("claim-reward").click();

  await roadButton.click();
  await expect(roadButton).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".ocean-explore-drawer")).toHaveCount(0);
});

test("Jump Up은 발판 상승과 DHA 시야 저하·회복·소진 규칙을 제공한다", async ({ page }) => {
  await createPet(page, "점프");
  await goToRoom(page, "바다");
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByTestId("start-jump-up").click();

  const liveScore = page.getByTestId("minigame-live-score");
  await expect(page.getByTestId("minigame-action")).toHaveText("점프 부스트");
  await expect(liveScore).toContainText("고도");
  await expect(liveScore).toContainText("DHA");
  await page.getByRole("button", { name: "왼쪽 레인 이동" }).click();
  await page.getByRole("button", { name: "오른쪽 레인 이동" }).click();
  await page.getByTestId("minigame-action").click();
  await page.getByRole("button", { name: "DHA 저하 테스트" }).click();
  await expect(page.getByTestId("dha-vision-warning")).toBeVisible();
  await page.getByRole("button", { name: "DHA 회복 테스트" }).click();
  await expect(page.getByTestId("dha-vision-warning")).toHaveCount(0);
  await page.getByRole("button", { name: "우주 단계 테스트" }).click();
  await expect(liveScore).toContainText("단계 4");
  await page.getByRole("button", { name: "데모 완료" }).click();
  await expect(page.getByRole("heading", { name: "우주에 도착했어요!" })).toBeVisible();
  await page.getByTestId("claim-reward").click();

  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByTestId("start-jump-up").click();
  await page.getByRole("button", { name: "DHA 소진 테스트" }).click();
  await expect(page.getByRole("heading", { name: "DHA 게이지가 모두 소진됐어요" })).toBeVisible();
  await page.getByTestId("claim-reward").click();
  await expect(page.getByRole("button", { name: "Games", exact: true })).toBeVisible();
});

test("Ocean Run 조작과 챕터 장비 상점이 실제 저장 인벤토리에 연결된다", async ({ page }) => {
  await createPet(page, "플레이어");
  await goToRoom(page, "바다");
  const gamesButton = page.getByRole("button", { name: "Games", exact: true });

  await gamesButton.click();
  await page.getByTestId("start-ocean-run").click();
  const action = page.getByTestId("minigame-action");
  const liveScore = page.getByTestId("minigame-live-score");
  await expect(action).toHaveText("점프 / 상승");
  await expect(liveScore).toContainText("챕터 1");
  await page.getByRole("button", { name: "왼쪽 레인 이동" }).click();
  await page.getByRole("button", { name: "오른쪽 레인 이동" }).click();
  await action.click();
  await expect(liveScore).toContainText("거리");
  await page.getByRole("button", { name: "DHA 소진 테스트" }).click();
  await expect(page.getByRole("heading", { name: "DHA 게이지가 모두 소진됐어요" })).toBeVisible();
  await page.getByTestId("claim-reward").click();

  await page.getByRole("button", { name: "상점", exact: true }).click();
  await expect(page.getByText("OCEAN RUN SUPPLY")).toBeVisible();
  await expect(page.locator(".catalog-grid article")).toHaveCount(2);
  await page.getByTestId("buy-ocean-oxygen-tank").click();
  await page.getByTestId("buy-ocean-submarine").click();
  await expect(page.getByTestId("buy-ocean-oxygen-tank")).toHaveText("보유 중");
  await expect(page.getByTestId("buy-ocean-submarine")).toHaveText("보유 중");
  await page.getByLabel("닫기").click();

  await page.reload();
  await expect(page.getByTestId("game-shell")).toBeVisible();
  await goToRoom(page, "바다");
  await page.getByRole("button", { name: "상점", exact: true }).click();
  await expect(page.getByTestId("buy-ocean-oxygen-tank")).toHaveText("보유 중");
  await expect(page.getByTestId("buy-ocean-submarine")).toHaveText("보유 중");
  await page.getByLabel("닫기").click();

  await goToRoom(page, "주방");
  await expect(page.locator(".minigame-controls")).toHaveCount(0);
  await expect(page.locator(".room-kitchen .context-tray > strong")).toHaveText("Kitchen");
  await expect(page.getByRole("navigation", { name: "방 이동" }).getByRole("button", { name: /홈/ })).toHaveAttribute("aria-current", "page");
});

test("PWA manifest와 오프라인 앱 셸을 제공한다", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest/);
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);

  const serviceWorkerResponse = await page.request.get("/sw.js");
  expect(serviceWorkerResponse.ok()).toBe(true);
  const serviceWorkerSource = await serviceWorkerResponse.text();
  expect(serviceWorkerSource).toContain("ocean-beach-game-v2.jpg");
  expect(serviceWorkerSource).not.toContain("ocean-beach-photoreal-v1.jpg");

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
