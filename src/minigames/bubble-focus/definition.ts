import { createMiniGameDefinition } from "../core/createDefinition";

export const definition = createMiniGameDefinition({
  id: "bubble-focus",
  title: "Bubble Focus",
  description: "움직이는 물방울을 빠르게 터치해 콤보를 이어가요.",
  requiredLevel: 1,
  durationSeconds: 30
});
