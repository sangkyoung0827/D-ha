import type { RoomId } from "./types";

export const HOME_INTERIOR_ROOMS = ["studio", "kitchen", "bathroom", "bedroom", "wardrobe"] as const satisfies readonly RoomId[];
export const OUTDOOR_ROOMS = ["wellness", "game-room"] as const satisfies readonly RoomId[];

const HOME_INTERIOR_SET = new Set<RoomId>(HOME_INTERIOR_ROOMS);
export type HomeInteriorRoom = (typeof HOME_INTERIOR_ROOMS)[number];

export function isHomeInterior(room: RoomId): room is HomeInteriorRoom {
  return HOME_INTERIOR_SET.has(room);
}

export function topLevelRoom(room: RoomId): "studio" | "wellness" | "game-room" {
  if (room === "wellness" || room === "game-room") return room;
  return "studio";
}
