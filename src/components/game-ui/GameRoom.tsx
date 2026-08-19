import type { ReactNode } from "react";
import type { RoomId } from "../../domain/types";
import { roomMeta } from "./roomMeta";

export function GameRoom({ room, petName, immersive = false, children }: { room: RoomId; petName: string; immersive?: boolean; children: ReactNode }) {
  const meta = roomMeta(room);
  return <section className={`game-stage room-${room} ${immersive ? "is-immersive" : ""}`} aria-label={`${meta.label} 공간`}><header className="room-heading"><div><span>{petName}</span><h1>{meta.shortLabel}</h1></div><i aria-hidden="true" /></header>{children}</section>;
}
