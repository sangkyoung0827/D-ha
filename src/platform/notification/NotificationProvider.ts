import type { GameNotification } from "../../domain/types";

export type PermissionResult = "granted" | "denied" | "unsupported";

export interface NotificationProvider {
  requestPermission(): Promise<PermissionResult>;
  schedule(notification: GameNotification): Promise<void>;
  cancel(id: string): Promise<void>;
}

export class BrowserNotificationProvider implements NotificationProvider {
  async requestPermission(): Promise<PermissionResult> {
    if (!("Notification" in window)) return "unsupported";
    const result = await Notification.requestPermission();
    return result === "granted" ? "granted" : "denied";
  }

  async schedule(notification: GameNotification): Promise<void> {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification(notification.title, { body: notification.body, tag: notification.id, icon: "/icon.svg" });
  }

  async cancel(): Promise<void> {
    return Promise.resolve();
  }
}

export const notificationProvider = new BrowserNotificationProvider();
