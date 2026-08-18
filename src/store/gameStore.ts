import { create } from "zustand";
import { ACHIEVEMENTS, unlockAchievements } from "../domain/achievements";
import { applyElapsedTime, applyNeedEffects, CARE_XP_COOLDOWN_MS, clamp } from "../domain/balance";
import { ITEM_BY_ID, ITEM_CATALOG } from "../domain/catalog";
import { createDefaultSave } from "../domain/defaults";
import { progressDailyGoal, refreshDailyGoals, updateBalancedGoal, localDateKey } from "../domain/daily";
import { calculateMiniGameReward, canPurchase, spendCoins } from "../domain/economy";
import { levelFromXp, LEVEL_THRESHOLDS } from "../domain/progression";
import type {
  CharacterProfile,
  GameNotification,
  GameSave,
  GameSettings,
  MiniGameResult,
  NeedValues,
  RoomId,
  WearableSlot
} from "../domain/types";
import { clearGame, loadGame, saveGame } from "./persistence";
import { parseImportedSave } from "./migrations";

export type OverlayId = "none" | "inventory" | "shop" | "wardrobe" | "achievements" | "friends" | "settings" | "daily" | "notifications";

interface GameRuntime {
  hydrated: boolean;
  currentRoom: RoomId;
  overlay: OverlayId;
  recoveryMessage: string | null;
  recoveryBackup: string | null;
  activeMiniGame: MiniGameResult["gameId"] | null;
  toast: string | null;
}

interface GameActions {
  hydrate(): Promise<void>;
  createKeeper(profile: CharacterProfile): void;
  finishTutorial(): void;
  setRoom(room: RoomId): void;
  setOverlay(overlay: OverlayId): void;
  care(kind: "feed" | "wash" | "sleep" | "wellness" | "play", itemId?: string): void;
  purchase(itemId: string): void;
  equip(itemId: string): void;
  setTheme(itemId: string): void;
  completeMiniGame(result: MiniGameResult): void;
  setActiveMiniGame(id: MiniGameResult["gameId"] | null): void;
  greetFriend(friendId: string): void;
  updateSettings(settings: Partial<GameSettings>): void;
  dismissNotification(id: string): void;
  clearToast(): void;
  exportData(): string;
  importData(raw: string): boolean;
  resetGame(): Promise<void>;
  demoAdvance(hours: number): void;
  demoSetNeeds(needs: Partial<NeedValues>): void;
  demoAddCoins(amount: number): void;
  demoSetLevel(level: number): void;
  demoUnlockAll(): void;
  demoResetAchievements(): void;
  demoTestNotification(): void;
}

export type GameStore = GameSave & GameRuntime & GameActions;

function addNotification(save: GameSave, notification: Omit<GameNotification, "id" | "createdAt">, now = new Date()): GameSave {
  return {
    ...save,
    notifications: [
      {
        ...notification,
        id: `${notification.kind}-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now.toISOString()
      },
      ...save.notifications
    ].slice(0, 30)
  };
}

function saveFromStore(state: GameStore): GameSave {
  return {
    version: 3,
    profile: state.profile,
    tutorialComplete: state.tutorialComplete,
    needs: state.needs,
    lastSavedAt: state.lastSavedAt,
    lastCareAt: state.lastCareAt,
    coins: state.coins,
    xp: state.xp,
    level: state.level,
    inventory: state.inventory,
    equipped: state.equipped,
    roomTheme: state.roomTheme,
    decorations: state.decorations,
    achievements: state.achievements,
    dailyDate: state.dailyDate,
    dailyGoals: state.dailyGoals,
    highScores: state.highScores,
    settings: state.settings,
    loginStreak: state.loginStreak,
    lastLoginDate: state.lastLoginDate,
    stats: state.stats,
    greetedFriends: state.greetedFriends,
    notifications: state.notifications
  };
}

function finalizeSave(next: GameSave, previous: GameSave, now = new Date()): GameSave {
  const refreshed = refreshDailyGoals(next.dailyDate, next.dailyGoals, now);
  let dailyGoals = updateBalancedGoal(refreshed.goals, next.needs);
  const previousCompleted = new Set(previous.dailyGoals.filter((goal) => goal.completed).map((goal) => goal.id));
  const newlyCompleted = dailyGoals.filter((goal) => goal.completed && !previousCompleted.has(goal.id));
  let finalized: GameSave = {
    ...next,
    dailyDate: refreshed.date,
    dailyGoals,
    coins: next.coins + newlyCompleted.length * 35,
    xp: next.xp + newlyCompleted.length * 20,
    lastSavedAt: now.toISOString()
  };
  for (const goal of newlyCompleted) {
    finalized = addNotification(
      finalized,
      { title: "일일 목표 완료", body: `${goal.label} · 35 코인`, kind: "daily" },
      now
    );
  }
  const oldLevel = previous.level;
  finalized.level = Math.min(99, levelFromXp(finalized.xp));
  finalized = unlockAchievements(finalized, now);
  finalized.level = Math.min(99, levelFromXp(finalized.xp));
  if (finalized.level > oldLevel) {
    finalized = addNotification(
      { ...finalized, coins: finalized.coins + (finalized.level - oldLevel) * 75 },
      {
        title: `Level ${finalized.level}`,
        body: "새로운 Keeper 기능과 아이템이 해금됐어요.",
        kind: "level"
      },
      now
    );
  }
  dailyGoals = finalized.dailyGoals;
  return { ...finalized, dailyGoals };
}

function dayDistance(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by ?? 0, (bm ?? 1) - 1, bd ?? 1) - Date.UTC(ay ?? 0, (am ?? 1) - 1, ad ?? 1)) /
      86_400_000
  );
}

const initial = createDefaultSave();

export const useGameStore = create<GameStore>((set, get) => {
  const commit = (producer: (save: GameSave) => GameSave, toast?: string) => {
    const previous = saveFromStore(get());
    const next = finalizeSave(producer(previous), previous);
    set({ ...next, toast: toast ?? get().toast });
    void saveGame(next);
  };

  return {
    ...initial,
    hydrated: false,
    currentRoom: "studio",
    overlay: "none",
    recoveryMessage: null,
    recoveryBackup: null,
    activeMiniGame: null,
    toast: null,

    async hydrate() {
      const result = await loadGame();
      const now = new Date();
      let save = result?.save ?? createDefaultSave(now);
      const elapsed = applyElapsedTime(save.needs, save.lastSavedAt, now);
      const today = localDateKey(now);
      const distance = dayDistance(save.lastLoginDate, today);
      save = {
        ...save,
        needs: elapsed.needs,
        dailyDate: refreshDailyGoals(save.dailyDate, save.dailyGoals, now).date,
        dailyGoals: refreshDailyGoals(save.dailyDate, save.dailyGoals, now).goals,
        loginStreak: distance === 1 ? save.loginStreak + 1 : distance > 1 ? 1 : save.loginStreak,
        lastLoginDate: today,
        lastSavedAt: now.toISOString()
      };
      if (elapsed.elapsedHours >= 1) {
        save = addNotification(save, {
          title: "다시 만나서 반가워요",
          body: "오늘부터 천천히 이어가요. 바다는 그대로 기다리고 있어요.",
          kind: "return"
        });
      }
      save = finalizeSave(save, result?.save ?? save, now);
      set({
        ...save,
        hydrated: true,
        recoveryMessage: result?.status === "corrupt" ? result.message ?? "저장 복구가 필요합니다." : null,
        recoveryBackup: result?.status === "corrupt" ? result.backup ?? null : null
      });
      await saveGame(save);
    },

    createKeeper(profile) {
      const next = createDefaultSave(new Date(), profile);
      set({ ...next, hydrated: true, toast: `${profile.name}와의 첫 항해를 시작해요.` });
      void saveGame(next);
    },

    finishTutorial() {
      commit(
        (save) =>
          addNotification(
            { ...save, tutorialComplete: true, coins: save.coins + 80, xp: save.xp + 30 },
            { title: "튜토리얼 완료", body: "80 코인과 30 XP를 받았어요.", kind: "system" }
          ),
        "Ocean Keeper 기초 훈련 완료!"
      );
    },

    setRoom(currentRoom) {
      set({ currentRoom, overlay: currentRoom === "shop" ? "shop" : "none" });
    },

    setOverlay(overlay) {
      set({ overlay });
    },

    care(kind, itemId) {
      commit((save) => {
        const now = new Date();
        const earnsXp = !save.lastCareAt || now.getTime() - new Date(save.lastCareAt).getTime() >= CARE_XP_COOLDOWN_MS;
        let needs = save.needs;
        const inventory = { ...save.inventory };
        const stats = { ...save.stats, careActions: save.stats.careActions + 1 };
        let dailyGoals = save.dailyGoals;
        let xpGain = earnsXp ? 14 : 3;
        let message = "Keeper가 기분 좋게 반응했어요.";

        if (kind === "feed") {
          const item = itemId ? ITEM_BY_ID[itemId] : undefined;
          if (!item || item.category !== "food" || (inventory[item.id] ?? 0) < 1) return save;
          inventory[item.id] = (inventory[item.id] ?? 0) - 1;
          needs = applyNeedEffects(needs, item.effects ?? {}, now.toISOString(), now);
          stats.meals += 1;
          dailyGoals = progressDailyGoal(dailyGoals, "feed");
          message = `${item.name}, 잘 먹었어!`;
        } else if (kind === "wash") {
          needs = applyNeedEffects(needs, { hygiene: 38, joy: 3 }, now.toISOString(), now);
          stats.baths += 1;
          dailyGoals = progressDailyGoal(dailyGoals, "wash");
          xpGain += 4;
          message = "거품이 반짝여! 개운한 기분이야.";
        } else if (kind === "sleep") {
          needs = applyNeedEffects(needs, { energy: 42, satiety: -4, joy: 2 }, now.toISOString(), now);
          stats.sleeps += 1;
          xpGain += 4;
          message = "푹 쉬었어. 다시 천천히 시작해볼까?";
        } else if (kind === "wellness") {
          const item = itemId ? ITEM_BY_ID[itemId] : undefined;
          if (!item || item.category !== "wellness" || (inventory[item.id] ?? 0) < 1) return save;
          inventory[item.id] = (inventory[item.id] ?? 0) - 1;
          needs = applyNeedEffects(needs, item.effects ?? {}, now.toISOString(), now);
          message = `${item.name}으로 게임 속 컨디션을 전환했어.`;
        } else {
          needs = applyNeedEffects(needs, { joy: 14, energy: -3 }, now.toISOString(), now);
          message = "같이 놀아서 즐거워!";
        }

        return addNotification(
          {
            ...save,
            needs,
            inventory,
            stats,
            dailyGoals,
            xp: save.xp + xpGain,
            lastCareAt: now.toISOString()
          },
          { title: "돌봄 완료", body: message, kind: "care" },
          now
        );
      }, "돌봄이 반영됐어요.");
    },

    purchase(itemId) {
      const item = ITEM_BY_ID[itemId];
      if (!item) return;
      const state = get();
      if (!canPurchase(state.coins, item.price, state.level, item.requiredLevel)) {
        set({ toast: state.level < item.requiredLevel ? `Level ${item.requiredLevel}에서 해금돼요.` : "코인이 부족해요." });
        return;
      }
      commit(
        (save) =>
          addNotification(
            {
              ...save,
              coins: spendCoins(save.coins, item.price),
              inventory: { ...save.inventory, [item.id]: (save.inventory[item.id] ?? 0) + 1 },
              stats: { ...save.stats, purchases: save.stats.purchases + 1 }
            },
            { title: "구매 완료", body: `${item.name}을(를) 보관함에 넣었어요.`, kind: "purchase" }
          ),
        `${item.name} 구매 완료`
      );
    },

    equip(itemId) {
      const item = ITEM_BY_ID[itemId];
      if (!item?.wearableSlot || (get().inventory[itemId] ?? 0) < 1) return;
      commit(
        (save) => ({
          ...save,
          equipped: { ...save.equipped, [item.wearableSlot as WearableSlot]: itemId },
          needs: applyNeedEffects(save.needs, { joy: 3 }, new Date().toISOString())
        }),
        `${item.name} 장착 완료`
      );
    },

    setTheme(itemId) {
      const item = ITEM_BY_ID[itemId];
      if (!item?.themeId || (get().inventory[itemId] ?? 0) < 1) return;
      commit(
        (save) => ({
          ...save,
          roomTheme: item.themeId ?? save.roomTheme,
          stats: { ...save.stats, themeChanges: save.stats.themeChanges + 1 }
        }),
        `${item.name} 테마 적용`
      );
    },

    completeMiniGame(result) {
      const reward = calculateMiniGameReward(result);
      commit(
        (save) => ({
          ...save,
          coins: save.coins + reward.coins,
          xp: save.xp + reward.xp,
          needs: applyNeedEffects(save.needs, { joy: result.success ? 12 : 6, energy: -4 }, new Date().toISOString()),
          highScores: { ...save.highScores, [result.gameId]: Math.max(save.highScores[result.gameId] ?? 0, result.score) },
          dailyGoals: progressDailyGoal(save.dailyGoals, "play"),
          stats: {
            ...save.stats,
            minigames: save.stats.minigames + 1,
            minigameIds: Array.from(new Set([...save.stats.minigameIds, result.gameId])),
            totalMinigameScore: save.stats.totalMinigameScore + Math.max(0, result.score)
          }
        }),
        `${reward.coins} 코인 · ${reward.xp} XP 획득`
      );
      set({ activeMiniGame: null });
    },

    setActiveMiniGame(activeMiniGame) {
      set({ activeMiniGame, overlay: "none" });
    },

    greetFriend(friendId) {
      const today = localDateKey();
      if (get().greetedFriends[friendId] === today) {
        set({ toast: "오늘의 인사 보상은 이미 받았어요." });
        return;
      }
      commit(
        (save) => ({
          ...save,
          coins: save.coins + 30,
          greetedFriends: { ...save.greetedFriends, [friendId]: today },
          needs: applyNeedEffects(save.needs, { joy: 6 }, new Date().toISOString())
        }),
        "데모 친구 인사 보상 · 30 코인"
      );
    },

    updateSettings(settings) {
      commit((save) => ({ ...save, settings: { ...save.settings, ...settings } }), "설정을 저장했어요.");
    },

    dismissNotification(id) {
      commit((save) => ({ ...save, notifications: save.notifications.filter((notification) => notification.id !== id) }));
    },

    clearToast() {
      set({ toast: null });
    },

    exportData() {
      return JSON.stringify(saveFromStore(get()), null, 2);
    },

    importData(raw) {
      const result = parseImportedSave(raw);
      if (result.status === "corrupt") {
        set({ toast: result.message ?? "가져오기에 실패했어요." });
        return false;
      }
      set({ ...result.save, toast: "저장 데이터를 안전하게 가져왔어요." });
      void saveGame(result.save);
      return true;
    },

    async resetGame() {
      await clearGame();
      const next = createDefaultSave();
      set({ ...next, recoveryBackup: null, recoveryMessage: null, currentRoom: "studio", overlay: "none", toast: "새 게임을 준비했어요." });
      await saveGame(next);
    },

    demoAdvance(hours) {
      commit((save) => {
        const now = new Date();
        const fakeLastSaved = new Date(now.getTime() - Math.max(0, hours) * 3_600_000).toISOString();
        const elapsed = applyElapsedTime(save.needs, fakeLastSaved, now);
        return addNotification(
          { ...save, needs: elapsed.needs },
          { title: "데모 시간 경과", body: `${hours}시간 경과를 도메인 규칙으로 반영했어요.`, kind: "system" }
        );
      }, `${hours}시간을 시뮬레이션했어요.`);
    },

    demoSetNeeds(partial) {
      commit((save) => {
        const base = {
          satiety: clamp(partial.satiety ?? save.needs.satiety),
          hygiene: clamp(partial.hygiene ?? save.needs.hygiene),
          energy: clamp(partial.energy ?? save.needs.energy),
          joy: clamp(partial.joy ?? save.needs.joy),
          condition: save.needs.condition
        };
        return { ...save, needs: applyNeedEffects(base, {}, save.lastCareAt) };
      }, "상태 테스트 값 적용");
    },

    demoAddCoins(amount) {
      commit((save) => ({ ...save, coins: Math.max(0, save.coins + Math.floor(amount)) }), `${amount} 코인 추가`);
    },

    demoSetLevel(level) {
      const safeLevel = Math.max(1, Math.min(10, Math.floor(level)));
      const xp = LEVEL_THRESHOLDS[safeLevel - 1] ?? 0;
      commit((save) => ({ ...save, xp, level: safeLevel }), `Level ${safeLevel} 적용`);
    },

    demoUnlockAll() {
      commit(
        (save) => ({
          ...save,
          inventory: Object.fromEntries(ITEM_CATALOG.map((item) => [item.id, Math.max(1, save.inventory[item.id] ?? 0)]))
        }),
        "모든 아이템 잠금 해제"
      );
    },

    demoResetAchievements() {
      commit((save) => ({ ...save, achievements: [] }), `${ACHIEVEMENTS.length}개 업적을 초기화했어요.`);
    },

    demoTestNotification() {
      commit(
        (save) =>
          addNotification(save, {
            title: "데모 신호 수신",
            body: "인앱 알림 어댑터가 정상적으로 동작합니다.",
            kind: "system"
          }),
        "테스트 알림을 만들었어요."
      );
    }
  };
});
