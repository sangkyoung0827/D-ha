export const DIHA_OFFICIAL_HOST = "d-ha.vercel.app";

export function canonicalUrlFor(url: URL): string | null {
  if (url.hostname === DIHA_OFFICIAL_HOST || !url.hostname.endsWith(".vercel.app")) return null;

  const canonical = new URL(url.href);
  canonical.protocol = "https:";
  canonical.hostname = DIHA_OFFICIAL_HOST;
  canonical.port = "";
  return canonical.href;
}

export function redirectToCanonicalHost(location: Pick<Location, "href" | "replace"> = window.location): boolean {
  const target = canonicalUrlFor(new URL(location.href));
  if (!target) return false;
  location.replace(target);
  return true;
}
