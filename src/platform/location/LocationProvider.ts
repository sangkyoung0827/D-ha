export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface TrackedLocationPoint extends LocationPoint {
  accuracy: number;
  capturedAt: string;
}

export type LocationWatchError = "unsupported" | "permission-denied" | "position-unavailable" | "timeout";

export interface LocationProvider {
  current(): Promise<LocationPoint>;
  watch(onPosition: (point: TrackedLocationPoint) => void, onError: (error: LocationWatchError) => void): () => void;
}

export class WebLocationProvider implements LocationProvider {
  async current(): Promise<LocationPoint> {
    if (!navigator.geolocation) throw new Error("unsupported");
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => reject(new Error("permission-denied")),
        { enableHighAccuracy: true, timeout: 8_000 }
      );
    });
  }

  watch(onPosition: (point: TrackedLocationPoint) => void, onError: (error: LocationWatchError) => void): () => void {
    if (!navigator.geolocation) throw new Error("unsupported");
    const watchId = navigator.geolocation.watchPosition(
      (position) => onPosition({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Math.max(0, position.coords.accuracy),
        capturedAt: new Date(position.timestamp || Date.now()).toISOString()
      }),
      (error) => onError(locationErrorCode(error.code)),
      { enableHighAccuracy: true, maximumAge: 3_000, timeout: 12_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }
}

export const locationProvider: LocationProvider = new WebLocationProvider();

function locationErrorCode(code: number): LocationWatchError {
  if (code === 1) return "permission-denied";
  if (code === 2) return "position-unavailable";
  return "timeout";
}
