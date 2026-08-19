import type { ItemDefinition } from "./types";

export const ITEM_CATALOG: ItemDefinition[] = [
  { id: "food-sea-bowl", category: "food", name: "바다빛 곡물볼", description: "산뜻한 한 끼", price: 38, requiredLevel: 1, effects: { satiety: 24, joy: 2 }, color: "#f4b860", symbol: "◒" },
  { id: "food-coral-toast", category: "food", name: "코랄 토스트", description: "바삭한 아침 식사", price: 30, requiredLevel: 1, effects: { satiety: 18, joy: 3 }, color: "#ef8f7c", symbol: "▰" },
  { id: "food-kelp-roll", category: "food", name: "그린 켈프롤", description: "푸른 잎을 닮은 롤", price: 44, requiredLevel: 2, effects: { satiety: 22, joy: 4 }, color: "#5bbf91", symbol: "●" },
  { id: "food-shell-pasta", category: "food", name: "쉘 파스타", description: "조개 모양 파스타", price: 56, requiredLevel: 3, effects: { satiety: 30, joy: 5 }, color: "#ffd07c", symbol: "◔" },
  { id: "food-tide-soup", category: "food", name: "타이드 수프", description: "포근한 파도빛 수프", price: 48, requiredLevel: 4, effects: { satiety: 20, energy: 4 }, color: "#71c4d5", symbol: "∪" },
  { id: "food-pearl-rice", category: "food", name: "펄 라이스", description: "작고 반짝이는 주먹밥", price: 60, requiredLevel: 5, effects: { satiety: 34, joy: 4 }, color: "#f1efe6", symbol: "◆" },
  { id: "food-sun-fruit", category: "food", name: "선코스트 과일", description: "해안의 햇살 같은 과일", price: 42, requiredLevel: 6, effects: { satiety: 16, joy: 8 }, color: "#ff9d57", symbol: "✦" },
  { id: "food-reef-box", category: "food", name: "리프 도시락", description: "탐험 전 든든한 도시락", price: 82, requiredLevel: 8, effects: { satiety: 40, joy: 6 }, color: "#8ebf73", symbol: "▣" },

  { id: "well-water", category: "wellness", name: "수분 드링크", description: "게임 속 수분과 기분을 채워요", price: 52, requiredLevel: 1, effects: { energy: 8, joy: 4 }, color: "#66d7df", symbol: "◉" },
  { id: "well-rest-tea", category: "wellness", name: "휴식 티", description: "차분한 휴식 연출 아이템", price: 64, requiredLevel: 2, effects: { energy: 18 }, color: "#a6d99b", symbol: "⌁" },
  { id: "well-mood", category: "wellness", name: "기분 전환 스무디", description: "즐거움을 선명하게 채워요", price: 70, requiredLevel: 3, effects: { joy: 22 }, color: "#e98eb2", symbol: "♥" },
  { id: "well-style", category: "wellness", name: "스타일 체인지 토닉", description: "옷장으로 이동하는 게임 아이템", price: 90, requiredLevel: 5, effects: { joy: 8 }, color: "#a890df", symbol: "✧" },
  { id: "well-growth", category: "wellness", name: "성장 프리뷰 캡슐", description: "다음 해금을 미리 보여줘요", price: 110, requiredLevel: 7, effects: { joy: 10 }, color: "#6c9ee8", symbol: "◇" },

  { id: "bundle-family-dha", category: "dha-bundle", name: "패밀리 DHA 듀오", description: "반려동물용 DHA 츄와 사람용 조류 DHA 식품을 함께 담은 게임 내 세트", price: 180, requiredLevel: 1, effects: { energy: 12, joy: 8 }, color: "#167f86", symbol: "DHA" },
  { id: "bundle-ocean-daily", category: "dha-bundle", name: "오션 데일리 세트", description: "강아지·고양이용 오메가 토퍼와 사람용 DHA 스낵 구성", price: 240, requiredLevel: 2, effects: { energy: 16, joy: 9 }, color: "#4a9fc0", symbol: "Ω3" },
  { id: "bundle-senior-balance", category: "dha-bundle", name: "시니어 밸런스 세트", description: "노령 반려동물용 DHA 케어와 사람용 데일리 DHA 식품 구성", price: 320, requiredLevel: 4, effects: { energy: 20, joy: 10 }, color: "#8b78b5", symbol: "D+" },
  { id: "bundle-cat-dha", category: "dha-bundle", name: "캣 앤 패밀리 DHA", description: "고양이용 피쉬 DHA 바이트와 사람용 조류 DHA 젤리 구성", price: 280, requiredLevel: 3, effects: { energy: 18, joy: 12 }, color: "#df8d64", symbol: "CAT" },

  { id: "pet-health-probiotic", category: "pet-health", name: "반려견 프로바이오틱 바이트", description: "반려견의 장 건강 루틴을 위한 데일리 영양 바이트", price: 95, requiredLevel: 1, effects: { energy: 7, joy: 4 }, color: "#62a86f", symbol: "BIO" },
  { id: "pet-health-joint", category: "pet-health", name: "반려견 조인트 오메가 츄", description: "활동적인 반려견의 관절 케어를 위한 영양 츄", price: 125, requiredLevel: 2, effects: { energy: 11 }, color: "#e1a548", symbol: "JOINT" },
  { id: "pet-health-coat", category: "pet-health", name: "반려견 스킨 앤 코트 밸런스", description: "반려견의 피부와 모질 관리를 위한 영양제", price: 140, requiredLevel: 3, effects: { joy: 13 }, color: "#d77889", symbol: "COAT" },
  { id: "pet-health-eye", category: "pet-health", name: "반려견 브라이트 아이 케어", description: "반려견의 눈 건강 관리 습관을 위한 데일리 케어", price: 155, requiredLevel: 4, effects: { joy: 9, energy: 7 }, color: "#597fb3", symbol: "EYE" },
  { id: "pet-health-senior", category: "pet-health", name: "반려견 시니어 데일리 팩", description: "노령 반려견의 균형 잡힌 영양 케어 패키지", price: 210, requiredLevel: 6, effects: { energy: 18, joy: 8 }, color: "#7f779b", symbol: "AGE+" },

  { id: "top-rookie", category: "top", name: "화이트 반팔 티셔츠", description: "디하의 산뜻한 기본 반팔", price: 0, requiredLevel: 1, wearableSlot: "top", color: "#f7f7f2", symbol: "▱" },
  { id: "top-coast", category: "top", name: "코스트 셔츠", description: "바람이 통하는 셔츠", price: 140, requiredLevel: 2, wearableSlot: "top", color: "#65c7c1", symbol: "▱" },
  { id: "top-reef", category: "top", name: "리프 베스트", description: "산호 조사용 베스트", price: 190, requiredLevel: 4, wearableSlot: "top", color: "#ef8576", symbol: "▱" },
  { id: "top-current", category: "top", name: "커런트 후디", description: "파도선이 있는 후디", price: 230, requiredLevel: 6, wearableSlot: "top", color: "#508cdb", symbol: "▱" },
  { id: "top-dawn", category: "top", name: "던 키퍼 코트", description: "새벽 탐사용 코트", price: 310, requiredLevel: 8, wearableSlot: "top", color: "#7a7eb7", symbol: "▱" },
  { id: "top-deep", category: "top", name: "딥씨 점퍼", description: "깊은 바다색 점퍼", price: 390, requiredLevel: 10, wearableSlot: "top", color: "#183e66", symbol: "▱" },

  { id: "bottom-sand", category: "bottom", name: "클래식 청바지", description: "디하의 편안한 기본 데님", price: 0, requiredLevel: 1, wearableSlot: "bottom", color: "#4773a5", symbol: "∪" },
  { id: "bottom-tide", category: "bottom", name: "타이드 쇼츠", description: "활동적인 반바지", price: 120, requiredLevel: 3, wearableSlot: "bottom", color: "#4ea8b8", symbol: "∪" },
  { id: "bottom-reef", category: "bottom", name: "리프 카고", description: "도구 주머니가 있는 바지", price: 210, requiredLevel: 6, wearableSlot: "bottom", color: "#608f7b", symbol: "∪" },
  { id: "bottom-night", category: "bottom", name: "나이트 다이브 팬츠", description: "야간 탐사용 바지", price: 300, requiredLevel: 9, wearableSlot: "bottom", color: "#263d5d", symbol: "∪" },

  { id: "shoes-deck", category: "shoes", name: "데크 스니커즈", description: "미끄럽지 않은 기본화", price: 0, requiredLevel: 1, wearableSlot: "shoes", color: "#f4f0e6", symbol: "◡" },
  { id: "shoes-splash", category: "shoes", name: "스플래시 러너", description: "민첩한 탐험화", price: 120, requiredLevel: 3, wearableSlot: "shoes", color: "#52b8ce", symbol: "◡" },
  { id: "shoes-coral", category: "shoes", name: "코랄 부츠", description: "따뜻한 산호색 부츠", price: 190, requiredLevel: 6, wearableSlot: "shoes", color: "#e87765", symbol: "◡" },
  { id: "shoes-abyss", category: "shoes", name: "어비스 부츠", description: "깊은 바다 탐험화", price: 280, requiredLevel: 9, wearableSlot: "shoes", color: "#243b64", symbol: "◡" },

  { id: "acc-clear", category: "accessory", name: "클리어 글라스", description: "투명한 기본 안경", price: 0, requiredLevel: 1, wearableSlot: "accessory", color: "#d5f1ef", symbol: "∞" },
  { id: "acc-coral", category: "accessory", name: "코랄 핀", description: "산호 가지 모양 핀", price: 90, requiredLevel: 2, wearableSlot: "accessory", color: "#ee8276", symbol: "⋔" },
  { id: "acc-tide", category: "accessory", name: "타이드 고글", description: "둥근 파도 고글", price: 150, requiredLevel: 4, wearableSlot: "accessory", color: "#69cbd6", symbol: "∞" },
  { id: "acc-star", category: "accessory", name: "씨스타 이어링", description: "별 모양 귀 장식", price: 190, requiredLevel: 6, wearableSlot: "accessory", color: "#ffc95c", symbol: "✦" },
  { id: "acc-research", category: "accessory", name: "리서치 바이저", description: "자료를 읽는 바이저", price: 260, requiredLevel: 8, wearableSlot: "accessory", color: "#729be0", symbol: "═" },
  { id: "acc-deep", category: "accessory", name: "딥 라이트", description: "어두운 곳을 비추는 장식", price: 330, requiredLevel: 10, wearableSlot: "accessory", color: "#8af1da", symbol: "●" },

  { id: "theme-sunlab", category: "theme", name: "선라이트 랩", description: "밝은 모래빛 연구실", price: 0, requiredLevel: 1, themeId: "sunlab", color: "#f5d990", symbol: "☀" },
  { id: "theme-lagoon", category: "theme", name: "라군 데크", description: "청록빛 라군 테마", price: 260, requiredLevel: 3, themeId: "lagoon", color: "#5bcac2", symbol: "≈" },
  { id: "theme-coral", category: "theme", name: "코랄 스테이션", description: "따뜻한 산호 관측소", price: 340, requiredLevel: 6, themeId: "coral", color: "#ed8d7f", symbol: "⌁" },
  { id: "theme-midnight", category: "theme", name: "미드나이트 돔", description: "별이 보이는 심해 돔", price: 480, requiredLevel: 9, themeId: "midnight", color: "#253d70", symbol: "☾" },

  { id: "decor-shell", category: "decoration", name: "소리 조개", description: "잔잔한 파도 장식", price: 70, requiredLevel: 1, color: "#f3c3a4", symbol: "◔" },
  { id: "decor-map", category: "decoration", name: "해류 지도", description: "직접 그린 탐험 지도", price: 100, requiredLevel: 2, color: "#8bc8b7", symbol: "⌁" },
  { id: "decor-coral", category: "decoration", name: "코랄 모형", description: "오리지널 산호 모형", price: 150, requiredLevel: 4, color: "#ef887b", symbol: "⋔" },
  { id: "decor-lamp", category: "decoration", name: "펄 램프", description: "은은한 진주빛 조명", price: 190, requiredLevel: 5, color: "#f4e9c8", symbol: "◉" },
  { id: "decor-drone", category: "decoration", name: "미니 탐사정", description: "작은 해양 탐사 장식", price: 260, requiredLevel: 7, color: "#70a6db", symbol: "◇" },
  { id: "decor-gate", category: "decoration", name: "Ocean Gate 키트", description: "잠긴 해역을 암시하는 모형", price: 390, requiredLevel: 10, color: "#49c9ba", symbol: "⬡" }
];

export const ITEM_BY_ID = Object.fromEntries(ITEM_CATALOG.map((item) => [item.id, item])) as Record<
  string,
  ItemDefinition
>;

export const STARTER_INVENTORY: Record<string, number> = {
  "food-sea-bowl": 3,
  "food-coral-toast": 2,
  "well-water": 1,
  "top-rookie": 1,
  "bottom-sand": 1,
  "shoes-deck": 1,
  "acc-clear": 1,
  "theme-sunlab": 1
};
