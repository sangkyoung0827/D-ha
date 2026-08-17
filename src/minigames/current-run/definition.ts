import { createMiniGameDefinition } from "../core/createDefinition";

export const definition = createMiniGameDefinition({
  id: "current-run",
  title: "Current Run",
  description: "세 해류 레인을 오가며 장애물을 피하고 에너지 구체를 모아요.",
  requiredLevel: 2,
  durationSeconds: 35
});
