import type { IncomingMessage, ServerResponse } from "node:http";
import { placeSearchHandler } from "../server/placeSearch.js";

export default function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  return placeSearchHandler(request, response);
}
