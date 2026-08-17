import type { RoomId } from "../../domain/types";

const ROOMS: Array<{ id: RoomId; label: string; symbol: string }> = [
  { id: "studio", label: "스튜디오", symbol: "⌂" },
  { id: "kitchen", label: "주방", symbol: "◒" },
  { id: "bathroom", label: "욕실", symbol: "◌" },
  { id: "bedroom", label: "침실", symbol: "☾" },
  { id: "wellness", label: "랩", symbol: "◇" },
  { id: "game-room", label: "게임", symbol: "✦" },
  { id: "wardrobe", label: "옷장", symbol: "▱" },
  { id: "shop", label: "상점", symbol: "▣" }
];

export function RoomNav({ current, onChange }: { current: RoomId; onChange(room: RoomId): void }) {
  return <nav className="room-nav" aria-label="방 이동">{ROOMS.map((room) => <button key={room.id} className={current === room.id ? "active" : ""} aria-current={current === room.id ? "page" : undefined} onClick={() => onChange(room.id)}><b>{room.symbol}</b><span>{room.label}</span></button>)}</nav>;
}
