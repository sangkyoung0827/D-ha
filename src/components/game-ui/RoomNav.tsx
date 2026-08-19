import type { RoomId } from "../../domain/types";
import { topLevelRoom } from "../../domain/home";
import { GameIcon } from "../icons/GameIcon";

export function RoomNav({ current, shopActive, onChange, onOpenShop }: { current: RoomId; shopActive: boolean; onChange(room: RoomId): void; onOpenShop(): void }) {
  const activeRoom = topLevelRoom(current);
  return <nav className="room-nav" aria-label="방 이동">
    <button className={!shopActive && activeRoom === "studio" ? "active" : ""} aria-label="홈 이동" aria-current={!shopActive && activeRoom === "studio" ? "page" : undefined} onClick={() => onChange("studio")}><b><GameIcon name="home" /></b><span>Home</span></button>
    <button className={!shopActive && activeRoom === "wellness" ? "active" : ""} aria-label="바다 이동" aria-current={!shopActive && activeRoom === "wellness" ? "page" : undefined} onClick={() => onChange("wellness")}><b><GameIcon name="ocean" /></b><span>Ocean</span></button>
    <button className={shopActive ? "active" : ""} aria-label="상점 열기" aria-current={shopActive ? "page" : undefined} onClick={onOpenShop}><b><GameIcon name="shop" /></b><span>상점</span></button>
  </nav>;
}
