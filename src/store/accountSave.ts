import type { RecoveryResult } from "./migrations";

function validTimestamp(result: RecoveryResult): number {
  const timestamp = new Date(result.save.lastSavedAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function newestAccountSave(
  local: RecoveryResult | null,
  cloud: RecoveryResult | null
): RecoveryResult | null {
  if (!local || local.status === "corrupt") return cloud ?? local;
  if (!cloud || cloud.status === "corrupt") return local;
  return validTimestamp(cloud) > validTimestamp(local) ? cloud : local;
}
