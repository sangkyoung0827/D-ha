import { registerSW } from "virtual:pwa-register";

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Keep an installed D ha PWA on the current release without asking the player
 * to manually clear caches or reload after a deployment.
 */
export function startPwaUpdate(): () => void {
  if (!("serviceWorker" in navigator)) return () => undefined;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  let registration: ServiceWorkerRegistration | undefined;
  const updateHandle: { apply?: (reloadPage?: boolean) => Promise<void> } = {};

  const handleControllerChange = () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  };

  const checkForUpdate = () => {
    if (document.visibilityState === "visible") void registration?.update();
  };

  navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

  updateHandle.apply = registerSW({
    immediate: true,
    onRegisteredSW: (_serviceWorkerUrl, registered) => {
      registration = registered;
      void registration?.update();
    },
    onNeedRefresh: () => {
      void updateHandle.apply?.(true);
    }
  });

  document.addEventListener("visibilitychange", checkForUpdate);
  const updateInterval = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);

  return () => {
    window.clearInterval(updateInterval);
    document.removeEventListener("visibilitychange", checkForUpdate);
    navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  };
}
