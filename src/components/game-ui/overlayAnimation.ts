import { gameBridge } from "../../game/bridge/GameBridge";
import type { OverlayId } from "../../store/gameStore";

export function animateKeeperForOverlay(overlay: OverlayId): void {
  if (overlay === "wardrobe") {
    gameBridge.emit("keeper:react", { action: "level" });
  }
}
