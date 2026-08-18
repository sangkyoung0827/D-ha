import { OCEAN_GAME_BY_ID } from "../../domain/ocean";
import type { MiniGameId } from "../../domain/types";
import { createMiniGameDefinition } from "../core/createDefinition";

export function createOceanDefinition(id: MiniGameId) {
  const game = OCEAN_GAME_BY_ID.get(id);
  if (!game) throw new Error(`Unknown ocean game: ${id}`);
  return createMiniGameDefinition({
    id: game.id,
    title: game.title,
    description: game.description,
    requiredLevel: game.requiredLevel,
    durationSeconds: game.durationSeconds
  });
}
