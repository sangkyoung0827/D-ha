import { createMiniGameDefinition } from "../core/createDefinition";

export const definition = createMiniGameDefinition({
  id: "reef-memory",
  title: "Reef Memory",
  description: "오리지널 해양 심볼 6쌍을 기억해 모두 찾아요.",
  requiredLevel: 3,
  durationSeconds: 60
});
