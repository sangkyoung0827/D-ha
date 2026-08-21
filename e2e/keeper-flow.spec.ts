import { expect, test, type Page } from "@playwright/test";

async function createPet(page: Page, name = "마루") {
  await page.goto("/?debug=1");
  await expect(page).toHaveTitle(/Diha 디하/);
  await expect(page.getByRole("img", { name: "선글라스를 쓰고 손을 흔들며 인사하는 알약 디하" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("안녕!");
  await page.getByRole("button", { name: "디하 시작하기" }).click();
  await expect(page.getByTestId("account-gate")).toBeVisible();
  await expect(page.getByText("먼저 로그인하고 반려동물을 등록해요")).toBeVisible();
  await expect(page.getByTestId("pet-creator")).toHaveCount(0);
  await page.getByRole("button", { name: "Google로 계속" }).click();
  await expect(page.getByTestId("pet-creator")).toBeVisible();
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

test("로그인 후 반려동물을 등록하고 기존 계정은 시작 화면 없이 복원한다", async ({ page }) => {
  await createPet(page, "로그인펫");

  await page.reload();

  await expect(page.getByTestId("game-shell")).toBeVisible();
  await expect(page.getByText("로그인펫", { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId("account-gate")).toHaveCount(0);
  await expect(page.getByTestId("pet-creator")).toHaveCount(0);
});

test("반려동물 생성부터 돌봄, 미니게임, 구매, 장착과 새로고침 저장까지", async ({ page }) => {
  test.setTimeout(240_000);
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
  await expect(page.getByText("보송보송 씻는 중")).toBeVisible();

  await goToRoom(page, "침실");
  await page.getByTestId("sleep-button").click();
  await expect(page.getByText("포근하게 쉬는 중")).toBeVisible();

  await goToRoom(page, "바다");
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByTestId("start-ocean-run").click();
  await expect(page.getByTestId("minigame-live-score")).toContainText("챕터 1");
  await page.getByTestId("debug-finish-game").dispatchEvent("click");
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
  await expect(page.locator(".status-shell .need-indicator")).toHaveCount(3);
  for (const label of ["밥", "영양제", "운동"]) await expect(page.locator(`.need-indicator[aria-label^="${label} "]`)).toHaveCount(1);
  await expect(page.locator('.need-indicator[aria-label^="에너지 "]')).toHaveCount(0);
  const before = await page.locator(".need-indicator.need-joy").getAttribute("aria-label");
  await page.getByText("DEV", { exact: true }).click();
  await page.getByTestId("advance-1h").click();
  const after = await page.locator(".need-indicator.need-joy").getAttribute("aria-label");

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
  await page.getByRole("button", { name: "반려견 영양제" }).click();
  await expect(page.getByText("반려견 프로바이오틱 바이트")).toBeVisible();
  await page.getByLabel("닫기").click();

  await expect(page.locator(".room-studio .context-tray")).toHaveCount(0);
  await expect(page.getByTestId("home-pet-avatar")).toBeVisible();
  await expect(page.locator(".home-pet-cushion")).toBeVisible();
  await expect(page.getByTestId("home3d-joystick")).toHaveCount(0);
  const petPlaces = page.getByRole("navigation", { name: "반려동물 장소" });
  await expect(petPlaces.getByRole("button")).toHaveCount(5);
  await expect(petPlaces.getByRole("button", { name: /동물병원/ })).toBeVisible();
  await expect(petPlaces.getByRole("button", { name: /펫 일기/ })).toBeVisible();
  await expect(petPlaces.getByRole("button", { name: /펫의 탐험/ })).toBeVisible();
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
  const seatGap = await page.evaluate(() => {
    const paw = document.querySelector(".home-pet-avatar .pet-leg");
    const cushion = document.querySelector(".home-pet-cushion");
    if (!paw || !cushion) throw new Error("반려동물 발 또는 쿠션을 찾을 수 없습니다.");
    return cushion.getBoundingClientRect().top - paw.getBoundingClientRect().bottom;
  });
  expect(seatGap).toBeLessThanOrEqual(4);
  expect(seatGap).toBeGreaterThanOrEqual(-20);
  await expect(page.getByTestId("home-3d-canvas")).toHaveCount(0);
  await expect(page.getByTestId("home3d-joystick")).toHaveCount(0);
  await expect(page.getByText("거실", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "동선이 쓰다듬기" }).click();
  await expect(page.getByRole("button", { name: "동선이 쓰다듬기" })).toHaveClass(/reaction-happy/);
  await expect(page.getByTestId("home-feed-bowl")).toBeVisible();
  await page.getByTestId("home-feed-bowl").click();
  await expect(page.getByTestId("home-pet-scene")).toHaveClass(/is-feeding/);
  await expect(page.locator(".home-meal-feedback")).toContainText("밥 게이지 +50");
  await expect(page.getByRole("button", { name: /^밥 50,/ })).toBeVisible();
  await page.getByTestId("home-feed-bowl").click();
  await expect(page.locator(".home-meal-feedback")).toContainText(/이미 (아침|저녁)밥을 먹었어요/);
  await page.getByRole("button", { name: /^밥 50,/ }).click();
  await expect(page.getByRole("dialog", { name: "하루 급양 횟수 설정" })).toBeVisible();
  await page.getByRole("button", { name: /하루 3회/ }).click();
  await expect(page.getByRole("button", { name: /^밥 33,/ })).toBeVisible();
  await page.getByRole("navigation", { name: "방 이동" }).getByRole("button", { name: /바다/ }).click();
  await expect(page.locator(".room-wellness .room-heading h1")).toHaveText("Ocean");
  await expect(page.getByRole("button", { name: "Games", exact: true })).toBeVisible();
});

test("홈 하단 헤더 펫 연구원은 로그인 토큰으로 질문하고 논문 출처를 표시한다", async ({ page }) => {
  let authorization = "";
  await page.route("**/api/pet-research", async (route) => {
    authorization = route.request().headers().authorization || "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: "## **반려견의 영양 상태**는 개별 건강 상태와 `식단`을 함께 살펴야 해요 [1].\n\n참고: 이 답변은 수의사의 진료를 대신하지 않습니다.",
        sources: [{
          id: "openalex:test",
          provider: "OpenAlex",
          title: "Companion animal nutrition review",
          url: "https://example.org/pet-study",
          year: 2025
        }]
      })
    });
  });
  await createPet(page, "연구견");
  const researcher = page.getByRole("region", { name: "헤더 펫 연구원" });
  await expect(researcher).toBeVisible();
  await researcher.getByLabel("펫 연구원에게 질문").fill("우리 강아지의 식단은 어떻게 확인해야 해?");
  await researcher.getByRole("button", { name: "질문 보내기" }).click();
  await expect(researcher.getByText(/영양 상태는 개별 건강 상태/)).toBeVisible();
  await expect(researcher).not.toContainText("**");
  await expect(researcher).not.toContainText("##");
  await expect(researcher).not.toContainText("`식단`");
  await expect(researcher.getByRole("link", { name: /Companion animal nutrition review/ })).toHaveAttribute("href", "https://example.org/pet-study");
  expect(authorization).toBe("Bearer e2e-google-user");
});

test("홈의 반려동물 영양제 추천은 규칙 계산과 AI 근거 설명을 함께 표시한다", async ({ page }) => {
  let requestBody: Record<string, unknown> = {};
  await page.route("**/api/pet-research", async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: "성장기 완전사료 영양 기준과 현재 섭취량의 차이를 계산한 참고값입니다 [1]. 제품 표시사항을 먼저 확인하세요 [2]. 질병 치료·예방 표현으로 사용하지 않습니다 [3]. 수의사 확인 전에는 실제 급여량을 확정하지 마세요.",
        assessment: {
          status: "planning-reference",
          caloriesPerDay: 500,
          caloriesSource: "entered",
          referenceEpaDhaMg: 65,
          currentEpaDhaMg: 20,
          calculatedGapMg: 45,
          productEpaDhaMg: 45,
          calculatedServings: 1,
          requiresVeterinarian: false,
          flags: ["이 값은 치료용 처방량이 아닙니다."]
        },
        sources: [{ id: "fediaf", citation: 1, provider: "FEDIAF", title: "Nutritional Guidelines 2025", url: "https://example.org/fediaf", year: 2025 }]
      })
    });
  });

  await createPet(page, "영양이");
  const places = page.getByRole("navigation", { name: "반려동물 장소" });
  const recommendationButton = places.getByRole("button", { name: /반려동물 영양제 추천/ });
  await expect(recommendationButton).toBeVisible();
  await expect(places.getByRole("button", { name: /펫샵/ })).toHaveCount(0);
  await recommendationButton.click();
  await expect(page.getByTestId("pet-supplement-overlay")).toBeVisible();
  await page.getByLabel("현재 체중 (kg)").fill("5");
  await page.getByLabel("연령 단계").selectOption("growth");
  await page.getByLabel(/실제 일일 섭취 kcal/).fill("500");
  await page.getByLabel(/현재 사료·영양제 EPA\+DHA 합계/).fill("20");
  await page.getByLabel("제품 1회분 EPA (mg)").fill("20");
  await page.getByLabel("제품 1회분 DHA (mg)").fill("25");
  await page.getByRole("button", { name: "맞춤 영양 분석하기" }).click();
  await expect(page.getByTestId("supplement-result")).toContainText("45 mg");
  await expect(page.getByTestId("supplement-result")).toContainText("수의사 확인 전에는 실제 급여량을 확정하지 마세요.");
  expect(requestBody.task).toBe("supplement-recommendation");
});

test("동물병원·펫 일기·펫의 탐험 기록은 계정별 저장에 연결된다", async ({ page }) => {
  test.slow();
  await createPet(page, "기록이");
  const places = page.getByRole("navigation", { name: "반려동물 장소" });

  await places.getByRole("button", { name: /동물병원/ }).click();
  await expect(page.getByTestId("pet-hospital-overlay")).toBeVisible();
  await page.getByLabel("혈액형").selectOption({ label: "B형" });
  await page.getByLabel("마이크로칩 번호").fill("410-TEST-2026");
  await page.getByLabel("다니는 병원").fill("디하 동물병원");
  await page.getByLabel("환자번호").fill("PAT-0827");
  await page.getByRole("button", { name: "건강·연결 정보 저장" }).click();
  await expect(page.getByText("병원 연동 승인 대기")).toBeVisible();
  await page.getByText("＋ 진료기록 직접 등록").click();
  await page.getByLabel("병원", { exact: true }).fill("디하 동물병원");
  await page.getByLabel("진단/진료 항목").fill("정기 건강검진");
  await page.getByLabel("처치·처방").fill("혈액검사와 기본 검진 완료");
  await page.getByRole("button", { name: "진료기록 저장" }).click();
  await expect(page.getByText("정기 건강검진")).toBeVisible();
  await page.getByLabel("닫기").click();

  await places.getByRole("button", { name: /펫 일기/ }).click();
  await expect(page.getByTestId("pet-diary-overlay")).toBeVisible();
  await page.locator(".memory-photo-picker input").setInputFiles({
    name: "memory.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAUtBz3sAAAAASUVORK5CYII=", "base64")
  });
  await expect(page.getByAltText("대표사진 미리보기")).toBeVisible();
  await page.getByLabel("추억 제목").fill("처음 함께 간 바다");
  await page.getByLabel("함께한 이야기").fill("모래 위를 신나게 뛰어다녔어요.");
  await page.getByRole("button", { name: "추억 등록" }).click();
  await expect(page.getByText("처음 함께 간 바다")).toBeVisible();
  await page.getByLabel("닫기").click();

  await places.getByRole("button", { name: /펫의 탐험/ }).click();
  await expect(page.getByTestId("pet-exploration-overlay")).toBeVisible();
  await page.route("**/api/place-search?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ latitude: 37.5105, longitude: 126.995, displayName: "반포한강공원, 서초구, 서울특별시, 대한민국" })
    });
  });
  await expect(page.getByLabel("위도")).toHaveCount(0);
  await expect(page.getByLabel("경도")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "현재 위치 사용" })).toHaveCount(0);
  await page.getByLabel("장소 이름").fill("반포한강공원");
  await page.getByLabel("탐험 메모").fill("강변 산책과 노을 구경");
  await page.getByRole("button", { name: "장소 찾아 저장" }).click();
  await expect(page.locator(".location-message")).toContainText("위치를 찾아 저장했어요");
  await expect(page.getByText("반포한강공원").first()).toBeVisible();
  await expect(page.getByTitle("반포한강공원 지도")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: () => undefined,
        watchPosition: (success: PositionCallback) => {
          const startedAt = Date.now();
          const positions = [
            { latitude: 37.5105, longitude: 126.995, timestamp: startedAt },
            { latitude: 37.5108, longitude: 126.9951, timestamp: startedAt + 15_000 },
            { latitude: 37.5111, longitude: 126.9952, timestamp: startedAt + 30_000 }
          ];
          positions.forEach((position, index) => window.setTimeout(() => success({
            coords: { latitude: position.latitude, longitude: position.longitude, accuracy: 8 },
            timestamp: position.timestamp
          } as GeolocationPosition), index * 40));
          return 82;
        },
        clearWatch: () => undefined
      }
    });
  });
  await page.getByLabel("실시간 탐험 이름").fill("저녁 강변 탐험");
  await page.getByLabel("경로 기록 메모").fill("함께 걸은 경로");
  await page.getByRole("button", { name: "탐험 시작" }).click();
  await expect(page.getByTestId("live-exploration-point-count")).toHaveText("3");
  await expect(page.getByTitle("실시간 탐험 지도")).toBeVisible();
  await page.getByRole("button", { name: "탐험 종료 및 저장" }).click();
  await expect(page.getByText("저녁 강변 탐험").first()).toBeVisible();
  await expect(page.getByText(/m · \d+초/).first()).toBeVisible();
  await page.getByLabel("닫기").click();

  await page.reload();
  await places.getByRole("button", { name: /동물병원/ }).click();
  await expect(page.getByText("정기 건강검진")).toBeVisible();
  await page.getByLabel("닫기").click();
  await places.getByRole("button", { name: /펫 일기/ }).click();
  await expect(page.getByText("처음 함께 간 바다")).toBeVisible();
  await page.getByLabel("닫기").click();
  await places.getByRole("button", { name: /펫의 탐험/ }).click();
  await expect(page.getByText("저녁 강변 탐험").first()).toBeVisible();
  await expect(page.getByLabel("저장된 탐험 경로 누적 표시")).toBeVisible();
  await expect(page.getByText("반포한강공원").first()).toBeVisible();
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
  await expect(hub.getByRole("navigation", { name: "Ocean 하단 메뉴" }).getByRole("button")).toHaveCount(2);
  await expect(hub.getByRole("button", { name: "상점", exact: true })).toHaveCount(0);
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
  await expect(page.getByRole("button", { name: "게임에서 나가기" })).toBeVisible();
  await expect(page.locator(".minigame-controls")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "방 이동" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /일시정지|다시/ })).toHaveCount(0);
  await page.getByRole("button", { name: "게임에서 나가기" }).click();
  await expect(gamesButton).toBeVisible();
  await expect(page.getByRole("navigation", { name: "방 이동" })).toBeVisible();
  await gamesButton.click();
  await page.getByTestId("start-ocean-run").click();
  await expect(page.getByTestId("minigame-live-score")).toContainText("챕터 1");
  await expect(page.getByTestId("minigame-live-score")).toContainText("DHA");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await page.getByTestId("debug-dha-low").dispatchEvent("click");
  await expect(page.getByTestId("dha-vision-warning")).toHaveCount(1);
  await expect(page.getByTestId("minigame-live-score")).toContainText(/DHA (?:[1-9]|1[0-5])퍼센트/);
  await page.getByTestId("debug-dha-recover").dispatchEvent("click");
  await expect(page.getByTestId("dha-vision-warning")).toHaveCount(0);
  await expect.poll(async () => {
    const score = await page.getByTestId("minigame-live-score").textContent();
    return Number(score?.match(/DHA (\d+)퍼센트/)?.[1] ?? 0);
  }).toBeGreaterThan(20);
  await page.getByTestId("debug-finish-game").dispatchEvent("click");
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
  await expect(page.getByRole("button", { name: "게임에서 나가기" })).toBeVisible();
  await expect(page.locator(".minigame-controls")).toHaveCount(0);
  await expect(liveScore).toContainText("고도");
  await expect(liveScore).toContainText("DHA");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await page.getByTestId("debug-dha-low").dispatchEvent("click");
  await expect(page.getByTestId("dha-vision-warning")).toHaveCount(1);
  await page.getByTestId("debug-dha-recover").dispatchEvent("click");
  await expect(page.getByTestId("dha-vision-warning")).toHaveCount(0);
  await page.getByTestId("debug-jump-space").dispatchEvent("click");
  await expect(liveScore).toContainText("단계 4");
  await page.getByTestId("debug-finish-game").dispatchEvent("click");
  await expect(page.getByRole("heading", { name: "우주에 도착했어요!" })).toBeVisible();
  await page.getByTestId("claim-reward").click();

  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByTestId("start-jump-up").click();
  await page.getByTestId("debug-dha-empty").dispatchEvent("click");
  await expect(page.getByRole("heading", { name: "DHA 게이지가 모두 소진됐어요" })).toBeVisible();
  await page.getByTestId("claim-reward").click();
  await expect(page.getByRole("button", { name: "Games", exact: true })).toBeVisible();
});

test("Ocean Run 조작과 하단 DHA·반려견 영양 상점이 저장 인벤토리에 연결된다", async ({ page }) => {
  await createPet(page, "플레이어");
  await goToRoom(page, "바다");
  const gamesButton = page.getByRole("button", { name: "Games", exact: true });

  await gamesButton.click();
  await page.getByTestId("start-ocean-run").click();
  const liveScore = page.getByTestId("minigame-live-score");
  await expect(page.getByRole("button", { name: "게임에서 나가기" })).toBeVisible();
  await expect(page.locator(".minigame-controls")).toHaveCount(0);
  await expect(liveScore).toContainText("챕터 1");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(liveScore).toContainText("거리");
  await page.getByTestId("debug-dha-empty").dispatchEvent("click");
  await expect(page.getByRole("heading", { name: "DHA 게이지가 모두 소진됐어요" })).toBeVisible();
  await page.getByTestId("claim-reward").click();

  const bottomShop = page.getByRole("navigation", { name: "방 이동" }).getByRole("button", { name: "상점 열기" });
  await bottomShop.click();
  await expect(page.getByRole("heading", { name: "DHA와 반려견 영양 상점" })).toBeVisible();
  await expect(page.locator(".pet-store-tabs button")).toHaveCount(2);
  await expect(page.locator(".pet-store-grid article")).toHaveCount(4);
  await expect(page.getByText("딥 브레스 산소통")).toHaveCount(0);
  await expect(page.getByText("디하 미니 잠수함")).toHaveCount(0);
  await page.getByTestId("buy-bundle-family-dha").click();
  await page.getByRole("button", { name: "반려견 영양제" }).click();
  await expect(page.locator(".pet-store-grid article")).toHaveCount(5);
  await expect(page.getByText("반려견 프로바이오틱 바이트")).toBeVisible();
  await page.getByTestId("buy-pet-health-probiotic").click();

  await page.reload();
  await expect(page.getByTestId("game-shell")).toBeVisible();
  await page.getByRole("navigation", { name: "방 이동" }).getByRole("button", { name: "상점 열기" }).click();
  await expect(page.locator(".pet-store-grid article").filter({ hasText: "패밀리 DHA 듀오" })).toContainText("보유 1개");
  await page.getByRole("button", { name: "반려견 영양제" }).click();
  await expect(page.locator(".pet-store-grid article").filter({ hasText: "반려견 프로바이오틱 바이트" })).toContainText("보유 1개");
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
