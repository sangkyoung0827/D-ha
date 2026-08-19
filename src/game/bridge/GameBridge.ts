import type { PetAppearance } from "../../domain/pet";
import type { MiniGameResult, RoomId, WearableSlot } from "../../domain/types";
import type { OceanMode, OceanZoneId } from "../../domain/ocean";

export interface BridgeEvents {
  "room:change": { room: RoomId; theme: string };
  "ocean:view": { mode: OceanMode; zone: OceanZoneId };
  "pet:style": PetAppearance & { equipped: Record<WearableSlot, string | null> };
  "pet:react": { action: "feed" | "wash" | "sleep" | "wellness" | "play" | "level" };
  "settings:motion": { reduced: boolean };
  "bath:progress": { progress: number };
  "bath:complete": undefined;
  "kitchen:fridge-open": undefined;
  "home:door-enter": { room: RoomId };
  "minigame:start": { id: MiniGameResult["gameId"] };
  "minigame:finish": MiniGameResult;
  "minigame:pause": undefined;
  "minigame:resume": undefined;
  "minigame:restart": undefined;
  "minigame:move": { direction: -1 | 1 };
  "minigame:action": undefined;
  "minigame:progress": { gameId: MiniGameResult["gameId"]; score: number; playerPoints: number; computerPoints: number; dha?: number };
  "minigame:debug-dha": { value: number };
  "minigame:debug-jump-space": undefined;
  "minigame:demo-finish": undefined;
}

type Handler<T> = (detail: T) => void;

class GameBridge {
  private target = new EventTarget();

  emit<K extends keyof BridgeEvents>(type: K, detail: BridgeEvents[K]): void {
    this.target.dispatchEvent(new CustomEvent(String(type), { detail }));
  }

  on<K extends keyof BridgeEvents>(type: K, handler: Handler<BridgeEvents[K]>): () => void {
    const listener = (event: Event) => handler((event as CustomEvent<BridgeEvents[K]>).detail);
    this.target.addEventListener(String(type), listener);
    return () => this.target.removeEventListener(String(type), listener);
  }
}

export const gameBridge = new GameBridge();
