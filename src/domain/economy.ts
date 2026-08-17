import type { GameReward, MiniGameResult } from "./types";

export function grantCoins(current: number, amount: number): number {
  return Math.max(0, Math.floor(current + Math.max(0, amount)));
}

export function canPurchase(coins: number, price: number, level: number, requiredLevel: number): boolean {
  return price >= 0 && coins >= price && level >= requiredLevel;
}

export function spendCoins(coins: number, price: number): number {
  if (price < 0 || coins < price) throw new Error("코인이 부족합니다.");
  return Math.max(0, coins - price);
}

export function calculateMiniGameReward(result: MiniGameResult): GameReward {
  const score = Math.max(0, Math.min(10_000, Math.floor(result.score)));
  const base = result.success ? 25 : 8;
  return {
    coins: Math.min(180, base + Math.floor(score / 45)),
    xp: Math.min(90, 12 + Math.floor(score / 100))
  };
}
