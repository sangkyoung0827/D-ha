import type { ExplorationTrackPoint } from "./types";

export const MAX_EXPLORATION_TRACK_POINTS = 240;
export const MAX_EXPLORATION_ACCURACY_METERS = 120;
export const MAX_PLAUSIBLE_PET_SPEED_METERS_PER_SECOND = 15;

export function distanceBetweenTrackPoints(
  from: Pick<ExplorationTrackPoint, "latitude" | "longitude">,
  to: Pick<ExplorationTrackPoint, "latitude" | "longitude">
): number {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function appendExplorationTrackPoint(
  route: ExplorationTrackPoint[],
  point: ExplorationTrackPoint
): ExplorationTrackPoint[] {
  if (!isValidTrackPoint(point) || point.accuracy > MAX_EXPLORATION_ACCURACY_METERS) return route;
  const previous = route.at(-1);
  if (previous) {
    const distanceMeters = distanceBetweenTrackPoints(previous, point);
    const elapsedSeconds = (Date.parse(point.capturedAt) - Date.parse(previous.capturedAt)) / 1_000;
    if (elapsedSeconds > 0 && distanceMeters / elapsedSeconds > MAX_PLAUSIBLE_PET_SPEED_METERS_PER_SECOND) return route;
    if (distanceMeters < 2 && elapsedSeconds < 10) return route;
  }

  if (route.length < MAX_EXPLORATION_TRACK_POINTS) return [...route, point];
  const simplified = route.filter((_, index) => index === 0 || index % 2 === 0);
  return [...simplified, point];
}

export function totalExplorationDistanceMeters(route: ExplorationTrackPoint[]): number {
  return route.reduce((total, point, index) => {
    if (index === 0) return 0;
    return total + distanceBetweenTrackPoints(route[index - 1]!, point);
  }, 0);
}

function isValidTrackPoint(point: ExplorationTrackPoint): boolean {
  return Number.isFinite(point.latitude)
    && point.latitude >= -90
    && point.latitude <= 90
    && Number.isFinite(point.longitude)
    && point.longitude >= -180
    && point.longitude <= 180
    && Number.isFinite(point.accuracy)
    && point.accuracy >= 0
    && Number.isFinite(Date.parse(point.capturedAt));
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}
