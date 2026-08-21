export interface GeocodedPlace {
  latitude: number;
  longitude: number;
  displayName: string;
}

export type PlaceGeocoderErrorCode = "not-found" | "service-unavailable" | "invalid-response";

export class PlaceGeocoderError extends Error {
  constructor(readonly code: PlaceGeocoderErrorCode) {
    super(code);
    this.name = "PlaceGeocoderError";
  }
}

export interface PlaceGeocoder {
  search(query: string): Promise<GeocodedPlace>;
}

interface PlaceSearchResponse {
  latitude?: number;
  longitude?: number;
  displayName?: string;
}

export class OpenStreetMapPlaceGeocoder implements PlaceGeocoder {
  async search(query: string): Promise<GeocodedPlace> {
    const normalizedQuery = query.trim().slice(0, 120);
    if (!normalizedQuery) throw new PlaceGeocoderError("not-found");

    const url = `/api/place-search?q=${encodeURIComponent(normalizedQuery)}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" } });
    } catch {
      throw new PlaceGeocoderError("service-unavailable");
    }
    if (response.status === 404) throw new PlaceGeocoderError("not-found");
    if (!response.ok) throw new PlaceGeocoderError("service-unavailable");

    let result: PlaceSearchResponse;
    try {
      result = await response.json() as PlaceSearchResponse;
    } catch {
      throw new PlaceGeocoderError("invalid-response");
    }
    const latitude = Number(result.latitude);
    const longitude = Number(result.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new PlaceGeocoderError("invalid-response");
    }

    return {
      latitude,
      longitude,
      displayName: result.displayName?.trim() || normalizedQuery
    };
  }
}

export const placeGeocoder: PlaceGeocoder = new OpenStreetMapPlaceGeocoder();
