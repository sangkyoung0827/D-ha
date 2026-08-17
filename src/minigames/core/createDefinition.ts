import { calculateMiniGameReward } from "../../domain/economy";
import type { MiniGameDefinition } from "../../domain/types";

export function createMiniGameDefinition(
  input: Pick<MiniGameDefinition, "id" | "title" | "description" | "requiredLevel" | "durationSeconds">
): MiniGameDefinition {
  return {
    ...input,
    start() {},
    pause() {},
    resume() {},
    finish() {},
    calculateReward: calculateMiniGameReward
  };
}
