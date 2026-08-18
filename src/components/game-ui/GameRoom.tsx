import type { ReactNode } from "react";
import type { RoomId } from "../../domain/types";
import { roomMeta } from "./roomMeta";

export function GameRoom({ room, keeperName, children }: { room: RoomId; keeperName: string; children: ReactNode }) {
  const meta = roomMeta(room);
  return <section className={`game-stage room-${room}`} aria-label={`${meta.label} 공간`}><header className="room-heading"><div><span>{keeperName}</span><h1>{meta.shortLabel}</h1></div><i aria-hidden="true" /></header>{children}</section>;
}
