import { ITEM_CATALOG } from "../../domain/catalog";
import type { RoomId } from "../../domain/types";
import { gameBridge } from "../../game/bridge/GameBridge";
import { playFeedbackTone, vibrateFeedback } from "../../platform/audio/feedback";
import { useGameStore } from "../../store/gameStore";
import { GameIcon, type GameIconName } from "../icons/GameIcon";
import { roomMeta } from "./roomMeta";

interface ContextTrayProps {
  room: RoomId;
  bathProgress: number;
}

export function ContextTray({ room, bathProgress }: ContextTrayProps) {
  const inventory = useGameStore((state) => state.inventory);
  const settings = useGameStore((state) => state.settings);
  const care = useGameStore((state) => state.care);
  const setOverlay = useGameStore((state) => state.setOverlay);
  const meta = roomMeta(room);

  const perform = (action: "feed" | "wash" | "sleep" | "wellness" | "play", itemId?: string) => {
    care(action, itemId);
    gameBridge.emit("keeper:react", { action });
    playFeedbackTone(settings.sound, action === "sleep" ? 330 : 540);
    vibrateFeedback(settings.vibration);
  };

  return <aside className="context-tray" aria-label={`${meta.label} 빠른 행동`}><strong>{meta.tray}</strong><div className="context-items">{renderItems()}</div></aside>;

  function renderItems() {
    if (room === "studio") return <><TrayButton icon="target" label="목표" onClick={() => setOverlay("daily")} /><TrayButton icon="inventory" label="보관함" onClick={() => setOverlay("inventory")} /><TrayButton icon="award" label="업적" onClick={() => setOverlay("achievements")} /><TrayButton icon="friends" label="친구" onClick={() => setOverlay("friends")} /></>;

    if (room === "kitchen") {
      const foods = ITEM_CATALOG.filter((item) => item.category === "food" && (inventory[item.id] ?? 0) > 0).slice(0, 2);
      return <><TrayButton icon="kitchen" label="냉장고" testId="open-fridge" onClick={() => gameBridge.emit("kitchen:fridge-open", undefined)} />{foods.map((item) => <TrayButton key={item.id} icon="food" label={item.name} testId={`feed-${item.id}`} onClick={() => perform("feed", item.id)} />)}<TrayButton icon="shop" label="식재료" testId="kitchen-shop" onClick={() => setOverlay("shop")} /></>;
    }

    if (room === "bathroom") return <><TrayButton icon="bath" label="샤워" testId="wash-button" badge={bathProgress ? `${bathProgress}%` : undefined} onClick={() => perform("wash")} /><TrayItem icon="water" label="물" /><TrayItem icon="sparkles" label="세면" /></>;

    if (room === "bedroom") return <><TrayButton icon="sleep" label="휴식" testId="sleep-button" onClick={() => perform("sleep")} /><TrayItem icon="light" label="조명" /><TrayItem icon="home" label="침대" /></>;

    if (room === "wardrobe") return <><TrayButton icon="shirt" label="옷장" testId="closet-open" onClick={() => setOverlay("wardrobe")} /><TrayButton icon="shop" label="의류" testId="closet-shop" onClick={() => setOverlay("shop")} /><TrayButton icon="inventory" label="보관함" onClick={() => setOverlay("inventory")} /></>;

    if (room === "game-room") {
      return <><TrayButton icon="equipment" label="스트레칭" onClick={() => perform("play")} /><TrayButton icon="workout" label="근력 운동" onClick={() => perform("play")} /><TrayButton icon="heart" label="회복 운동" onClick={() => perform("play")} /></>;
    }

    return null;
  }
}

function TrayButton({ icon, label, onClick, testId, disabled, badge }: { icon: GameIconName; label: string; onClick(): void; testId?: string; disabled?: boolean; badge?: string }) {
  return <button className="context-item" onClick={onClick} data-testid={testId} disabled={disabled} aria-label={badge ? `${label}, ${badge}` : label}><span><GameIcon name={icon} />{badge && <small>{badge}</small>}</span><em>{label}</em></button>;
}

function TrayItem({ icon, label }: { icon: GameIconName; label: string }) {
  return <div className="context-item is-static" aria-label={label}><span><GameIcon name={icon} /></span><em>{label}</em></div>;
}
