import type { SVGProps } from "react";

export type GameIconName =
  | "home"
  | "kitchen"
  | "ocean"
  | "bath"
  | "sleep"
  | "closet"
  | "workout"
  | "food"
  | "water"
  | "camera"
  | "fish"
  | "equipment"
  | "shirt"
  | "light"
  | "inventory"
  | "shop"
  | "settings"
  | "bell"
  | "target"
  | "award"
  | "friends"
  | "energy"
  | "heart"
  | "sparkles"
  | "gamepad";

const paths: Record<GameIconName, React.ReactNode> = {
  home: <><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  kitchen: <><path d="M7 3v8"/><path d="M4 3v5a3 3 0 0 0 6 0V3"/><path d="M7 11v10"/><path d="M17 3v18"/><path d="M14 3c0 5 1 7 3 7"/></>,
  ocean: <><path d="M3 7c2.2 0 2.2-2 4.5-2S9.8 7 12 7s2.2-2 4.5-2S18.8 7 21 7"/><path d="M3 12c2.2 0 2.2-2 4.5-2s2.3 2 4.5 2 2.2-2 4.5-2 2.3 2 4.5 2"/><path d="M3 17c2.2 0 2.2-2 4.5-2s2.3 2 4.5 2 2.2-2 4.5-2 2.3 2 4.5 2"/></>,
  bath: <><path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3Z"/><path d="M7 12V6a3 3 0 0 1 6 0"/><path d="M4 8h3"/><path d="M7 20v1M17 20v1"/></>,
  sleep: <><path d="M20 15.5A8 8 0 1 1 8.5 4 6.5 6.5 0 0 0 20 15.5Z"/><path d="M15 3h4l-4 4h4"/></>,
  closet: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M9 12h.01M15 12h.01"/></>,
  workout: <><path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/></>,
  food: <><path d="M4 10h16a8 8 0 0 1-16 0Z"/><path d="M8 6c0-1 1-2 2-2M12 6c0-1 1-2 2-2"/><path d="M3 10h18"/></>,
  water: <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11Z"/>,
  camera: <><path d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4.5Z"/><circle cx="12" cy="12" r="4"/></>,
  fish: <><path d="M16 12c-3.5-4-8-4-11 0 3 4 7.5 4 11 0Z"/><path d="m16 12 5-4v8l-5-4Z"/><path d="M8 11h.01"/></>,
  equipment: <><path d="m14 6 4 4M4 20l6.5-6.5"/><path d="m16 4 4 4-3 3-4-4 3-3ZM4 16l4 4-2 2-4-4 2-2Z"/></>,
  shirt: <path d="m8 4-5 3 3 5 2-1v9h8v-9l2 1 3-5-5-3a4 4 0 0 1-8 0Z"/>,
  light: <><path d="M9 18h6M10 22h4"/><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-1 .8-1.5 1.6-1.5 2.5h-4c0-.9-.5-1.7-1.5-2.5Z"/></>,
  inventory: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 5V3h8v2M4 10h16M9 14h6"/></>,
  shop: <><path d="M4 9h16l-1 12H5L4 9Z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3"/></>,
  award: <><circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/></>,
  friends: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
  energy: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z"/></>,
  gamepad: <><path d="M8 6h8a6 6 0 0 1 5.4 8.6l-1 2a2.5 2.5 0 0 1-4.1.6L14.5 15h-5l-1.8 2.2a2.5 2.5 0 0 1-4.1-.6l-1-2A6 6 0 0 1 8 6Z"/><path d="M7 10v4M5 12h4M16 11h.01M19 13h.01"/></>
};

export function GameIcon({ name, ...props }: { name: GameIconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}
