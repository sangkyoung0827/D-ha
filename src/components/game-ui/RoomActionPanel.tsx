import { ITEM_CATALOG } from "../../domain/catalog";
import type { MiniGameResult, RoomId } from "../../domain/types";
import { gameBridge } from "../../game/bridge/GameBridge";
import { playFeedbackTone, vibrateFeedback } from "../../platform/audio/feedback";
import { useGameStore } from "../../store/gameStore";

export function RoomActionPanel({ room, bathProgress, onStartGame }: { room: RoomId; bathProgress: number; onStartGame(id: MiniGameResult["gameId"]): void }) {
  const inventory = useGameStore((state) => state.inventory);
  const highScores = useGameStore((state) => state.highScores);
  const level = useGameStore((state) => state.level);
  const dailyGoals = useGameStore((state) => state.dailyGoals);
  const settings = useGameStore((state) => state.settings);
  const care = useGameStore((state) => state.care);
  const setOverlay = useGameStore((state) => state.setOverlay);

  const perform = (action: "feed" | "wash" | "sleep" | "wellness" | "play", itemId?: string) => {
    care(action, itemId);
    gameBridge.emit("keeper:react", { action });
    playFeedbackTone(settings.sound, action === "sleep" ? 330 : 540);
    vibrateFeedback(settings.vibration);
  };

  if (room === "studio") return <section className="action-panel studio-actions"><div><p className="eyebrow">TODAY AT A GLANCE</p><h2>오늘의 짧은 돌봄</h2><span>{dailyGoals.filter((goal) => goal.completed).length}/{dailyGoals.length} 완료</span></div><button onClick={() => setOverlay("daily")}>목표 보기</button><p>캐릭터를 직접 터치하면 여러 가지 반응을 보여줘요. <b>Ocean Gate</b>는 Level 10의 단서를 기다리고 있어요.</p></section>;

  if (room === "kitchen") {
    const foods = ITEM_CATALOG.filter((item) => item.category === "food" && (inventory[item.id] ?? 0) > 0);
    return <section className="action-panel"><header><div><p className="eyebrow">TIDE KITCHEN</p><h2>무엇을 함께 먹을까요?</h2></div><button className="text-button" onClick={() => setOverlay("inventory")}>보관함</button></header><div className="item-strip">{foods.length ? foods.map((item) => <button key={item.id} data-testid={`feed-${item.id}`} onClick={() => perform("feed", item.id)}><i style={{ background: item.color }}>{item.symbol}</i><span>{item.name}<small>{inventory[item.id]}개 · +{item.effects?.satiety ?? 0}</small></span></button>) : <p className="empty-copy">음식이 없어요. 상점에서 코인으로 구매할 수 있어요.</p>}</div></section>;
  }

  if (room === "bathroom") return <section className="action-panel"><header><div><p className="eyebrow">BUBBLE BAY</p><h2>Keeper를 문질러 거품을 채워요</h2></div><strong>{bathProgress}%</strong></header><div className="bath-meter"><span style={{ width: `${bathProgress}%` }} /></div><p>게임 화면의 캐릭터 위를 드래그하세요. 키보드 사용자는 아래 버튼으로 같은 돌봄을 완료할 수 있어요.</p><button className="primary-button" data-testid="wash-button" onClick={() => perform("wash")}>접근 가능한 빠른 씻기</button></section>;

  if (room === "bedroom") return <section className="action-panel sleep-actions"><div><p className="eyebrow">MOON CABIN</p><h2>조명을 낮추고 잠시 쉬어요</h2><p>에너지가 회복되고 포만감은 조금 줄어들어요.</p></div><button className="primary-button" data-testid="sleep-button" onClick={() => perform("sleep")}>☾ 조명 끄고 쉬기</button></section>;

  if (room === "wellness") {
    const items = ITEM_CATALOG.filter((item) => item.category === "wellness" && (inventory[item.id] ?? 0) > 0);
    return <section className="action-panel"><header><div><p className="eyebrow">WELLNESS LAB</p><h2>게임 속 기분 전환 아이템</h2></div><span className="demo-tag">의료 효능 없음</span></header><div className="item-strip">{items.length ? items.map((item) => <button key={item.id} onClick={() => perform("wellness", item.id)}><i style={{ background: item.color }}>{item.symbol}</i><span>{item.name}<small>{item.description} · {inventory[item.id]}개</small></span></button>) : <p className="empty-copy">보유한 웰니스 아이템이 없어요.</p>}</div></section>;
  }

  if (room === "game-room") {
    const games: Array<{ id: MiniGameResult["gameId"]; title: string; level: number; mark: string }> = [
      { id: "bubble-focus", title: "Bubble Focus", level: 1, mark: "◉" },
      { id: "current-run", title: "Current Run", level: 2, mark: "➤" },
      { id: "reef-memory", title: "Reef Memory", level: 3, mark: "◇" }
    ];
    return <section className="action-panel"><header><div><p className="eyebrow">CURRENT ARCADE</p><h2>플레이할 해류를 선택하세요</h2></div><span>오늘 {dailyGoals.find((goal) => goal.id === "play")?.completed ? "완료" : "미완료"}</span></header><div className="game-list">{games.map((game) => <button key={game.id} disabled={level < game.level} data-testid={`start-${game.id}`} onClick={() => onStartGame(game.id)}><b>{game.mark}</b><span><strong>{game.title}</strong><small>{level < game.level ? `Level ${game.level} 필요` : `최고 ${highScores[game.id] ?? 0}점`}</small></span><em>PLAY</em></button>)}</div></section>;
  }

  if (room === "wardrobe") return <section className="action-panel centered-action"><p className="eyebrow">KEEPER WARDROBE</p><h2>보유한 의상으로 스타일 세트를 만들어요</h2><button className="primary-button" onClick={() => setOverlay("wardrobe")}>옷장 열기</button></section>;
  if (room === "shop") return <section className="action-panel centered-action"><p className="eyebrow">COAST SUPPLY</p><h2>게임 코인으로만 아이템을 구매해요</h2><button className="primary-button" onClick={() => setOverlay("shop")}>상점 둘러보기</button></section>;
  return null;
}
