import { registerSW } from "virtual:pwa-register";

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export interface PwaUpdateCallbacks {
  onNeedRefresh(update: () => Promise<void>): void;
  onOfflineReady?(): void;
}

/** Owns service-worker state so React only renders the update experience. */
export function startPwaUpdate(callbacks: PwaUpdateCallbacks): () => void {
  if (!("serviceWorker" in navigator)) return () => undefined;

  let registration: ServiceWorkerRegistration | undefined;
  let updateServiceWorker: (reloadPage?: boolean) => Promise<void> = async () => undefined;

  const checkForUpdate = () => {
    if (document.visibilityState === "visible") void registration?.update();
  };

  updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW: (_serviceWorkerUrl, registered) => {
      registration = registered;
      void registration?.update();
    },
    onNeedRefresh: () => callbacks.onNeedRefresh(() => updateServiceWorker(true)),
    onOfflineReady: callbacks.onOfflineReady
  });

  document.addEventListener("visibilitychange", checkForUpdate);
  const updateInterval = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);

  return () => {
    window.clearInterval(updateInterval);
    document.removeEventListener("visibilitychange", checkForUpdate);
  };
}
