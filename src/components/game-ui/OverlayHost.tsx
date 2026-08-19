import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ACHIEVEMENTS } from "../../domain/achievements";
import { ITEM_CATALOG } from "../../domain/catalog";
import type { ItemCategory, RoomId } from "../../domain/types";
import { gameBridge } from "../../game/bridge/GameBridge";
import { playFeedbackTone, vibrateFeedback } from "../../platform/audio/feedback";
import { useAccount } from "../../platform/auth/AccountProvider";
import { notificationProvider } from "../../platform/notification/NotificationProvider";
import { socialProvider, type GameFriend } from "../../platform/social/SocialProvider";
import { useGameStore } from "../../store/gameStore";
import { VoiceEchoPanel } from "../settings/VoiceEchoPanel";
import { FoodIllustration } from "./FoodIllustration";
import { PetDiaryOverlay, PetExplorationOverlay, PetHospitalOverlay } from "./PetPlaceOverlays";
import { PetSupplementRecommendation } from "./PetSupplementRecommendation";

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: "음식",
  wellness: "웰니스",
  "dha-bundle": "DHA 패밀리 세트",
  "pet-health": "반려견 영양제",
  top: "상의",
  bottom: "하의",
  shoes: "신발",
  accessory: "액세서리",
  theme: "방 테마",
  decoration: "장식"
};

export function OverlayHost() {
  const overlay = useGameStore((state) => state.overlay);
  const setOverlay = useGameStore((state) => state.setOverlay);
  const profile = useGameStore((state) => state.profile);
  if (overlay === "none") return null;
  return (
    <div className="overlay-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOverlay("none"); }}>
      <section className={`sheet ${overlay === "fridge" ? "fridge-sheet" : ""} ${overlay === "pet-store" ? "pet-store-sheet" : ""} ${overlay.startsWith("pet-") && overlay !== "pet-store" ? "pet-feature-sheet" : ""}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-testid={overlay === "fridge" ? "fridge-overlay" : overlay === "pet-store" ? "pet-store-overlay" : undefined}>
        <button className="sheet-close" onClick={() => setOverlay("none")} aria-label="닫기">×</button>
        {overlay === "fridge" && <FridgeOverlay />}
        {overlay === "shop" && <ShopOverlay />}
        {overlay === "pet-store" && <PetStoreOverlay />}
        {overlay === "inventory" && <InventoryOverlay />}
        {overlay === "wardrobe" && <WardrobeOverlay />}
        {overlay === "achievements" && <AchievementsOverlay />}
        {overlay === "friends" && <FriendsOverlay />}
        {overlay === "settings" && <SettingsOverlay />}
        {overlay === "daily" && <DailyOverlay />}
        {overlay === "notifications" && <NotificationsOverlay />}
        {overlay === "pet-hospital" && <PetHospitalOverlay />}
        {overlay === "pet-diary" && <PetDiaryOverlay />}
        {overlay === "pet-exploration" && <PetExplorationOverlay />}
        {overlay === "pet-supplement" && <PetSupplementRecommendation pet={profile} />}
      </section>
    </div>
  );
}

function FridgeOverlay() {
  const inventory = useGameStore((state) => state.inventory);
  const level = useGameStore((state) => state.level);
  const settings = useGameStore((state) => state.settings);
  const care = useGameStore((state) => state.care);
  const setOverlay = useGameStore((state) => state.setOverlay);
  const foods = ITEM_CATALOG.filter((item) => item.category === "food");
  const ownedCount = foods.reduce((total, item) => total + (inventory[item.id] ?? 0), 0);

  const eat = (itemId: string) => {
    care("feed", itemId);
    gameBridge.emit("pet:react", { action: "feed" });
    playFeedbackTone(settings.sound, 540);
    vibrateFeedback(settings.vibration);
  };

  return <>
    <header className="fridge-header">
      <span aria-hidden="true">DIHA KITCHEN</span>
      <h2 id="sheet-title">냉장고</h2>
      <p><b>{ownedCount}</b>개의 신선한 식재료</p>
    </header>
    <div className="fridge-grid" aria-label="냉장고 음식">
      {foods.map((item) => {
        const quantity = inventory[item.id] ?? 0;
        const locked = level < item.requiredLevel;
        return <button
          key={item.id}
          className={quantity > 0 && !locked ? "available" : "empty"}
          data-testid={`fridge-${item.id}`}
          disabled={locked || quantity < 1}
          onClick={() => eat(item.id)}
          aria-label={locked ? `${item.name}, 레벨 ${item.requiredLevel}에 해금` : `${item.name}, ${quantity}개, 먹기`}
        >
          <span className="fridge-food-art"><FoodIllustration itemId={item.id} /></span>
          <strong>{item.name}</strong>
          <small>{locked ? `LV.${item.requiredLevel}` : `×${quantity}`}</small>
        </button>;
      })}
      <button className="fridge-add" onClick={() => setOverlay("shop")} aria-label="식재료 상점 열기">
        <span aria-hidden="true">＋</span><strong>식재료 추가</strong><small>상점</small>
      </button>
    </div>
    <p className="fridge-help">음식을 누르면 디하에게 바로 먹일 수 있어요.</p>
  </>;
}

function SheetHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="sheet-header"><p className="eyebrow">{eyebrow}</p><h2 id="sheet-title">{title}</h2><p>{copy}</p></header>;
}

function ShopOverlay() {
  const room = useGameStore((state) => state.currentRoom);
  const categories = shopCategories(room);
  const [category, setCategory] = useState<ItemCategory>(categories[0]!);
  const coins = useGameStore((state) => state.coins);
  const level = useGameStore((state) => state.level);
  const inventory = useGameStore((state) => state.inventory);
  const purchase = useGameStore((state) => state.purchase);
  const items = ITEM_CATALOG.filter((item) => item.category === category);
  return <><SheetHeader eyebrow="ROOM SUPPLY" title={`${roomShopTitle(room)} 아이템`} copy="이 공간에서 사용하는 게임 아이템만 표시합니다." /><div className="shop-wallet"><span>보유 코인</span><strong>● {coins.toLocaleString()}</strong></div>{categories.length > 1 && <div className="category-tabs">{categories.map((key) => <button key={key} className={category === key ? "active" : ""} onClick={() => setCategory(key)}>{CATEGORY_LABELS[key]}</button>)}</div>}<div className="catalog-grid">{items.map((item) => { const locked = level < item.requiredLevel; const poor = coins < item.price; return <article key={item.id} className={locked ? "locked" : ""}><i style={{ background: item.color }}>{item.symbol}</i><div><h3>{item.name}</h3><p>{item.description}</p><small>{inventory[item.id] ? `보유 ${inventory[item.id]}개` : `Level ${item.requiredLevel}`}</small></div><button data-testid={`buy-${item.id}`} disabled={locked || poor} onClick={() => purchase(item.id)}>{locked ? `LV.${item.requiredLevel}` : `● ${item.price}`}</button></article>; })}</div></>;
}

function PetStoreOverlay() {
  const [category, setCategory] = useState<"dha-bundle" | "pet-health">("dha-bundle");
  const coins = useGameStore((state) => state.coins);
  const level = useGameStore((state) => state.level);
  const inventory = useGameStore((state) => state.inventory);
  const purchase = useGameStore((state) => state.purchase);
  const items = ITEM_CATALOG.filter((item) => item.category === category);
  return <>
    <header className="pet-store-header">
      <div><p className="eyebrow">DIHA DHA & DOG HEALTH</p><h2 id="sheet-title">DHA와 반려견 영양 상점</h2><p>DHA 관련 상품과 반려견 영양제만 한곳에서 만나보세요.</p></div>
      <span aria-hidden="true"><b> DHA </b><i>＋</i><b> PET </b></span>
    </header>
    <div className="pet-store-trust" aria-label="상품 구성 안내"><span>🐾 반려동물용</span><span>☺ 사람용 식품</span><span>✓ 함께 구성</span></div>
    <div className="shop-wallet"><span>보유 코인</span><strong>● {coins.toLocaleString()}</strong></div>
    <div className="category-tabs pet-store-tabs">
      <button className={category === "dha-bundle" ? "active" : ""} onClick={() => setCategory("dha-bundle")}>DHA 패밀리 세트</button>
      <button className={category === "pet-health" ? "active" : ""} onClick={() => setCategory("pet-health")}>반려견 영양제</button>
    </div>
    <div className="catalog-grid pet-store-grid">{items.map((item) => {
      const locked = level < item.requiredLevel;
      const poor = coins < item.price;
      const quantity = inventory[item.id] ?? 0;
      return <article key={item.id} className={locked ? "locked" : ""}>
        <i style={{ background: item.color }}><b>{item.symbol}</b><small>{category === "dha-bundle" ? "FAMILY" : "PET CARE"}</small></i>
        <div><span className="product-audience">{category === "dha-bundle" ? "반려동물 + 사람" : "반려견용"}</span><h3>{item.name}</h3><p>{item.description}</p><small>{quantity ? `보유 ${quantity}개` : `Level ${item.requiredLevel}`}</small></div>
        <button data-testid={`buy-${item.id}`} disabled={locked || poor} onClick={() => purchase(item.id)}>{locked ? `LV.${item.requiredLevel}` : `● ${item.price}`}</button>
      </article>;
    })}</div>
    <p className="pet-store-note">게임 내 가상 상품입니다. 실제 급여·섭취 전에는 제품 표시사항과 전문가의 안내를 확인하세요.</p>
  </>;
}

function shopCategories(room: RoomId): ItemCategory[] {
  if (room === "kitchen") return ["food"];
  if (room === "wellness") return ["pet-health"];
  if (room === "wardrobe") return ["top", "bottom", "shoes", "accessory"];
  if (room === "bedroom") return ["theme", "decoration"];
  if (room === "game-room") return ["accessory"];
  return ["decoration", "theme"];
}

function roomShopTitle(room: RoomId): string {
  return { studio: "Home", kitchen: "Kitchen", wellness: "Ocean", bathroom: "Bath", bedroom: "Sleep", wardrobe: "Wardrobe", "game-room": "Workout", shop: "Room" }[room];
}

function InventoryOverlay() {
  const inventory = useGameStore((state) => state.inventory);
  const owned = ITEM_CATALOG.filter((item) => (inventory[item.id] ?? 0) > 0);
  return <><SheetHeader eyebrow="PLAYER INVENTORY" title="보관함" copy="구매·사용·장착 정보는 현재 Google 계정에 분리 저장됩니다." /><div className="inventory-list">{owned.map((item) => <article key={item.id}><i style={{ background: item.color }}>{item.symbol}</i><span><strong>{item.name}</strong><small>{CATEGORY_LABELS[item.category]} · {item.description}</small></span><b>{inventory[item.id]}개</b></article>)}</div></>;
}

function WardrobeOverlay() {
  const inventory = useGameStore((state) => state.inventory);
  const equipped = useGameStore((state) => state.equipped);
  const roomTheme = useGameStore((state) => state.roomTheme);
  const equip = useGameStore((state) => state.equip);
  const setTheme = useGameStore((state) => state.setTheme);
  const owned = ITEM_CATALOG.filter((item) => (inventory[item.id] ?? 0) > 0 && (item.wearableSlot || item.category === "theme"));
  return <><SheetHeader eyebrow="DIHA WARDROBE" title="스타일과 공간" copy="보유 아이템을 장착하고 세트를 영구 저장합니다." /><div className="wardrobe-grid">{owned.map((item) => { const active = item.wearableSlot ? equipped[item.wearableSlot] === item.id : item.themeId === roomTheme; return <button key={item.id} className={active ? "active" : ""} data-testid={`equip-${item.id}`} onClick={() => item.category === "theme" ? setTheme(item.id) : equip(item.id)}><i style={{ background: item.color }}>{item.symbol}</i><span><strong>{item.name}</strong><small>{active ? "현재 적용 중" : "적용하기"}</small></span></button>; })}</div></>;
}

function AchievementsOverlay() {
  const unlocked = useGameStore((state) => state.achievements);
  const unlockedMap = useMemo(() => new Map(unlocked.map((item) => [item.id, item])), [unlocked]);
  return <><SheetHeader eyebrow="DIHA LOG" title={`업적 ${unlocked.length}/${ACHIEVEMENTS.length}`} copy="보상은 달성 순간 한 번만 지급됩니다." /><div className="achievement-list">{ACHIEVEMENTS.map((achievement, index) => { const state = unlockedMap.get(achievement.id); return <article key={achievement.id} className={state ? "unlocked" : ""}><b>{state ? "✓" : String(index + 1).padStart(2, "0")}</b><span><strong>{achievement.title}</strong><small>{achievement.description}</small>{state && <em>{new Date(state.unlockedAt).toLocaleDateString("ko-KR")}</em>}</span><i>● {achievement.coins}</i></article>; })}</div></>;
}

function DailyOverlay() {
  const goals = useGameStore((state) => state.dailyGoals);
  const date = useGameStore((state) => state.dailyDate);
  return <><SheetHeader eyebrow="LOCAL DAILY ROUTE" title="오늘의 목표" copy={`${date} · 완료 목표마다 35 코인과 20 XP`} /><div className="daily-list">{goals.map((goal) => <article key={goal.id} className={goal.completed ? "completed" : ""}><b>{goal.completed ? "✓" : "○"}</b><span><strong>{goal.label}</strong><small>{goal.progress}/{goal.target}</small><i><em style={{ width: `${(goal.progress / goal.target) * 100}%` }} /></i></span></article>)}</div><p className="gentle-copy">완료하지 못해도 잃는 것은 없어요. 내일 다시 천천히 이어가면 됩니다.</p></>;
}

function FriendsOverlay() {
  const [friends, setFriends] = useState<GameFriend[]>([]);
  const greeted = useGameStore((state) => state.greetedFriends);
  const greet = useGameStore((state) => state.greetFriend);
  useEffect(() => { void socialProvider.listFriends().then(setFriends); }, []);
  return <><SheetHeader eyebrow="LOCAL SOCIAL MOCK" title="디하 친구 공간" copy="실제 사용자가 아닌 아키텍처 검증용 데모 친구입니다." /><div className="friend-grid">{friends.map((friend) => <article key={friend.id}><div className="friend-avatar" style={{ background: friend.outfitColor }}><span /></div><span className="demo-tag">{friend.note}</span><h3>{friend.name}</h3><p>{friend.rank}<br />{friend.theme}</p><button disabled={Boolean(greeted[friend.id])} onClick={() => greet(friend.id)}>{greeted[friend.id] ? "오늘 인사 완료" : "방문하고 인사 · 30"}</button></article>)}</div></>;
}

function NotificationsOverlay() {
  const notifications = useGameStore((state) => state.notifications);
  const dismiss = useGameStore((state) => state.dismissNotification);
  return <><SheetHeader eyebrow="IN-APP SIGNALS" title="알림 센터" copy="상태 변화와 보상 소식을 한곳에서 확인합니다." /><div className="notification-list">{notifications.length ? notifications.map((notification) => <article key={notification.id}><i>{notification.kind === "achievement" ? "✦" : notification.kind === "level" ? "↑" : "◌"}</i><span><strong>{notification.title}</strong><p>{notification.body}</p><small>{new Date(notification.createdAt).toLocaleString("ko-KR")}</small></span><button onClick={() => dismiss(notification.id)} aria-label={`${notification.title} 알림 닫기`}>×</button></article>) : <p className="empty-copy">새 알림이 없어요.</p>}</div></>;
}

function SettingsOverlay() {
  const settings = useGameStore((state) => state.settings);
  const update = useGameStore((state) => state.updateSettings);
  const exportData = useGameStore((state) => state.exportData);
  const importData = useGameStore((state) => state.importData);
  const resetGame = useGameStore((state) => state.resetGame);
  const [permissionMessage, setPermissionMessage] = useState("");

  const download = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `diha-save-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) importData(await file.text());
    event.target.value = "";
  };
  const requestNotifications = async () => {
    const result = await notificationProvider.requestPermission();
    update({ notifications: result === "granted" });
    setPermissionMessage(result === "granted" ? "브라우저 알림을 허용했어요." : result === "unsupported" ? "이 브라우저는 알림을 지원하지 않아요." : "알림 권한이 허용되지 않았어요.");
  };
  return <><SheetHeader eyebrow="PLAYER CLOUD" title="설정과 데이터" copy="게임 진행은 로그인한 사용자 UID별로 분리 저장됩니다." /><AccountSettings /><div className="settings-list"><Toggle label="사운드" detail="짧은 게임 피드백 음" checked={settings.sound} onChange={(sound) => update({ sound })} /><Toggle label="진동 효과" detail="지원 기기에서만 동작" checked={settings.vibration} onChange={(vibration) => update({ vibration })} /><Toggle label="애니메이션 감소" detail="큰 움직임과 반복 모션 축소" checked={settings.reducedMotion} onChange={(reducedMotion) => update({ reducedMotion })} /></div><section className="settings-section"><div><h3>브라우저 알림</h3><p>버튼을 눌렀을 때만 권한을 요청합니다. 서버 Push는 사용하지 않습니다.</p>{permissionMessage && <small>{permissionMessage}</small>}</div><button className="secondary-button" onClick={requestNotifications}>알림 권한 요청</button></section><VoiceEchoPanel /><section className="settings-section data-actions"><div><h3>저장 데이터</h3><p>현재 계정의 데이터만 내보내거나 가져옵니다. Zod 검증을 통과한 JSON만 허용합니다.</p></div><button className="secondary-button" data-testid="export-save" onClick={download}>JSON 내보내기</button><label className="secondary-button file-button">JSON 가져오기<input type="file" accept="application/json" onChange={importFile} data-testid="import-save" /></label><button className="danger-button" onClick={() => { if (window.confirm("현재 계정의 게임을 초기화할까요? 내보낸 백업 외에는 복구할 수 없습니다.")) void resetGame(); }}>게임 초기화</button></section></>;
}

function AccountSettings() {
  const { account, busy, signOut } = useAccount();
  const syncStatus = useGameStore((state) => state.syncStatus);
  const syncMessage = useGameStore((state) => state.syncMessage);
  if (!account) return null;
  return <section className="settings-account" data-testid="settings-account"><span className="account-avatar">{account.photoUrl ? <img src={account.photoUrl} alt="" referrerPolicy="no-referrer" /> : account.displayName.slice(0, 1)}</span><span><strong>{account.displayName}</strong><small>{account.email}</small><em className={`cloud-state ${syncStatus}`}>{syncMessage ?? "계정별 저장 사용 중"}</em></span><button className="secondary-button" disabled={busy} onClick={() => void signOut()}>로그아웃</button></section>;
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange(value: boolean): void }) {
  return <label className="toggle-row"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}
