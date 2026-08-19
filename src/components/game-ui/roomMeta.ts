import type { RoomId } from "../../domain/types";
import type { GameIconName } from "../icons/GameIcon";

export const ROOM_META: Array<{ id: RoomId; label: string; shortLabel: string; icon: GameIconName; tray: string }> = [
  { id: "studio", label: "홈", shortLabel: "Home", icon: "home", tray: "Home" },
  { id: "kitchen", label: "주방", shortLabel: "Kitchen", icon: "kitchen", tray: "Kitchen" },
  { id: "wellness", label: "바다", shortLabel: "Ocean", icon: "ocean", tray: "Ocean Expedition" },
  { id: "bathroom", label: "욕실", shortLabel: "Bath", icon: "bath", tray: "Bath Items" },
  { id: "bedroom", label: "침실", shortLabel: "Sleep", icon: "sleep", tray: "Sleep Items" },
  { id: "wardrobe", label: "옷장", shortLabel: "Closet", icon: "closet", tray: "Wardrobe" },
  { id: "game-room", label: "운동", shortLabel: "Workout", icon: "workout", tray: "Workout Gear" }
];

export const VISIBLE_ROOMS = ROOM_META.filter((room) => room.id === "studio" || room.id === "wellness" || room.id === "game-room");

export function roomMeta(room: RoomId) {
  return ROOM_META.find((item) => item.id === room) ?? ROOM_META[0]!;
}
