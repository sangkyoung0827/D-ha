import type { RoomId } from "../../domain/types";
import { topLevelRoom } from "../../domain/home";
import { GameIcon } from "../icons/GameIcon";
import { VISIBLE_ROOMS } from "./roomMeta";

export function RoomNav({ current, onChange }: { current: RoomId; onChange(room: RoomId): void }) {
  const activeRoom = topLevelRoom(current);
  return <nav className="room-nav" aria-label="방 이동">{VISIBLE_ROOMS.map((room) => <button key={room.id} className={activeRoom === room.id ? "active" : ""} aria-label={`${room.label} 이동`} aria-current={activeRoom === room.id ? "page" : undefined} onClick={() => onChange(room.id)}><b><GameIcon name={room.icon} /></b><span>{room.shortLabel}</span></button>)}</nav>;
}
