export interface DeferredInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorSnapshot {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
}

export function isIosDevice(snapshot: NavigatorSnapshot): boolean {
  return /iPad|iPhone|iPod/i.test(snapshot.userAgent)
    || (snapshot.platform === "MacIntel" && (snapshot.maxTouchPoints ?? 0) > 1);
}

export function isStandaloneDisplay(
  matchMedia: (query: string) => Pick<MediaQueryList, "matches">,
  standalone?: boolean
): boolean {
  return Boolean(standalone) || matchMedia("(display-mode: standalone)").matches;
}

export function shouldOfferIosGuide(): boolean {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return isIosDevice(iosNavigator)
    && !isStandaloneDisplay(window.matchMedia.bind(window), iosNavigator.standalone);
}

export function listenForPwaInstall(callbacks: {
  onPrompt(prompt: DeferredInstallPrompt): void;
  onInstalled(): void;
}): () => void {
  const onBeforeInstall = (event: Event) => {
    event.preventDefault();
    callbacks.onPrompt(event as DeferredInstallPrompt);
  };
  const onInstalled = () => callbacks.onInstalled();

  window.addEventListener("beforeinstallprompt", onBeforeInstall);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export async function requestPwaInstall(prompt: DeferredInstallPrompt): Promise<"accepted" | "dismissed"> {
  await prompt.prompt();
  return (await prompt.userChoice).outcome;
}
