export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface LocationProvider {
  current(): Promise<LocationPoint>;
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
}

export const locationProvider: LocationProvider = new WebLocationProvider();
