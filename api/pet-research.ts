import type { IncomingMessage, ServerResponse } from "node:http";
import { petResearchHandler } from "../server/petResearch.js";

export default function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  return petResearchHandler(request, response);
}
