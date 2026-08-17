import type { MiniGameDefinition, MiniGameResult } from "../../domain/types";

export async function loadMiniGameDefinition(id: MiniGameResult["gameId"]): Promise<MiniGameDefinition> {
  if (id === "bubble-focus") return (await import("../bubble-focus/definition")).definition;
  if (id === "current-run") return (await import("../current-run/definition")).definition;
  return (await import("../reef-memory/definition")).definition;
}
