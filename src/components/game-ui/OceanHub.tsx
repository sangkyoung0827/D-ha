import { useState, type SVGProps } from "react";
import { OCEAN_RUN_CHAPTERS, OCEAN_RUN_GAME, type OceanMode, type OceanZoneId } from "../../domain/ocean";
import type { MiniGameResult } from "../../domain/types";

interface OceanHubProps {
  mode: OceanMode;
  zone: OceanZoneId;
  highScores: Record<string, number>;
  oceanGear: { oxygenTank: boolean; submarine: boolean };
  onModeChange(mode: OceanMode): void;
  onZoneChange(zone: OceanZoneId): void;
  onStartGame(id: MiniGameResult["gameId"]): void;
  onOpenShop(): void;
}

export function OceanHub({ mode, highScores, oceanGear, onModeChange, onZoneChange, onStartGame, onOpenShop }: OceanHubProps) {
  const [gamesOpen, setGamesOpen] = useState(false);
  const bestScore = highScores[OCEAN_RUN_GAME.id] ?? 0;

  const toggleGames = () => {
    onModeChange("exploration");
    setGamesOpen(mode === "exploration" ? !gamesOpen : true);
  };

  return (
    <aside className="ocean-hub" aria-label="Ocean 빠른 메뉴">
      {gamesOpen && (
        <section className="ocean-explore-drawer ocean-games-board" aria-label="Games 선택">
          <header><div><span>ONE WORLD · ONE RUN</span><strong>Games</strong><small>{bestScore ? `BEST ${bestScore.toLocaleString()}` : "NEW RUN"}</small></div><button aria-label="Games 닫기" onClick={() => setGamesOpen(false)}>×</button></header>
          <article className="ocean-run-card">
            <OceanRunThumbnail />
            <div className="ocean-run-intro"><span>BEACH TO ABYSS</span><h3>Ocean Run</h3><p>서핑보드를 들고 출발해 파도, 해저 동굴, 심해까지 끊김 없이 달려요.</p></div>
            <ol className="ocean-run-route" aria-label="Ocean Run 챕터">
              {OCEAN_RUN_CHAPTERS.map((chapter) => {
                const owned = chapter.requiredItemId === null || (chapter.requiredItemId === "ocean-oxygen-tank" ? oceanGear.oxygenTank : oceanGear.submarine);
                return <li key={chapter.id} className={owned ? "ready" : "gear-needed"}><b>{chapter.number}</b><span><strong>{chapter.title}</strong><small>{chapter.mode}<br />{chapter.hazards}</small></span><em>{chapter.requiredItemId === null ? "READY" : owned ? "장비 완료" : chapter.id === "cave" ? "산소통 필요" : "잠수함 필요"}</em></li>;
              })}
            </ol>
            <div className="ocean-run-gear"><span className={oceanGear.oxygenTank ? "owned" : ""}>O₂ {oceanGear.oxygenTank ? "산소통 보유" : "상점에서 산소통 준비"}</span><span className={oceanGear.submarine ? "owned" : ""}>◉ {oceanGear.submarine ? "잠수함 보유" : "상점에서 잠수함 준비"}</span></div>
            <button className="ocean-run-start" data-testid="start-ocean-run" onClick={() => { onZoneChange("beach"); setGamesOpen(false); onStartGame(OCEAN_RUN_GAME.id); }}><span>탐험 시작</span><strong>RUN →</strong></button>
          </article>
        </section>
      )}

      <nav className="ocean-action-dock" aria-label="Ocean 하단 메뉴">
        <button className={`ocean-action-button explore ${mode === "exploration" ? "active" : ""}`} aria-expanded={gamesOpen} aria-current={mode === "exploration" ? "page" : undefined} onClick={toggleGames}>
          <span className="ocean-action-visual"><SurfboardIcon /></span><strong>Games</strong>
        </button>
        <button className="ocean-action-button shop" onClick={() => { setGamesOpen(false); onOpenShop(); }}>
          <span className="ocean-action-visual"><StorefrontIcon /></span><strong>상점</strong>
        </button>
        <button className={`ocean-action-button road ${mode === "coastal-road" ? "active" : ""}`} aria-current={mode === "coastal-road" ? "page" : undefined} onClick={() => { setGamesOpen(false); onModeChange("coastal-road"); }}>
          <span className="ocean-action-visual"><ConvertibleIcon /></span><strong>해안도로</strong>
        </button>
      </nav>
    </aside>
  );
}

function OceanRunThumbnail() {
  return <svg className="ocean-run-thumb" viewBox="0 0 340 118" aria-hidden="true"><defs><linearGradient id="run-sea" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#ffd98b"/><stop offset=".29" stopColor="#48cfcb"/><stop offset=".62" stopColor="#245b7a"/><stop offset="1" stopColor="#071a38"/></linearGradient></defs><rect width="340" height="118" rx="20" fill="url(#run-sea)"/><circle cx="42" cy="26" r="16" fill="#fff0a8"/><path d="M0 78c34-19 62-16 91 0s55 17 84 0 61-18 92 0 49 18 73 4v36H0Z" fill="#fff" opacity=".32"/><path d="M86 70c0-18 11-31 22-38l7 31-8 26" fill="none" stroke="#183e48" strokeWidth="7" strokeLinecap="round"/><path d="m104 35 19-14M109 44l22-4" stroke="#21745f" strokeWidth="7" strokeLinecap="round"/><ellipse cx="143" cy="82" rx="35" ry="7" fill="#ffd15f" stroke="#fff" strokeWidth="2" transform="rotate(-9 143 82)"/><circle cx="145" cy="49" r="8" fill="#c98665"/><path d="m145 57-8 22m8-22 14 19" stroke="#f8f7ef" strokeWidth="8" strokeLinecap="round"/><path d="m198 81 12-27 14 27Z" fill="#17384d"/><path d="M242 0h32l-9 18 10 15-12 18 10 15-16 22-15-5Z" fill="#101936" opacity=".82"/><ellipse cx="298" cy="75" rx="30" ry="18" fill="#efc45e" stroke="#fff1ba" strokeWidth="2"/><circle cx="298" cy="73" r="9" fill="#70d9d1"/><path d="m267 75-16-11v22Zm61 0 12-8v16Z" fill="#7587aa"/><g fill="#8dfff0"><circle cx="286" cy="25" r="2"/><circle cx="319" cy="42" r="3"/><circle cx="280" cy="97" r="2"/></g></svg>;
}

function SurfboardIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 72 72" aria-hidden="true" {...props}><defs><linearGradient id="surfboard-paint" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe27b"/><stop offset=".52" stopColor="#ff936f"/><stop offset="1" stopColor="#42c9c2"/></linearGradient></defs><path className="icon-shadow" d="M21 61c10 5 31 2 39-5"/><path className="board" d="M17 55C15 39 25 15 38 7c5-3 10-1 11 5 3 16-8 39-20 48-5 4-11 1-12-5Z"/><path className="board-stripe" d="m21 45 24-23M20 51l25-24"/><path className="board-line" d="M35 10c-1 14-7 32-16 44"/><path className="fin" d="m30 59 7 6-10-2"/></svg>;
}

function StorefrontIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 72 72" aria-hidden="true" {...props}><path className="icon-shadow" d="M12 63h49"/><path className="store-wall" d="M15 28h42v33H15z"/><path className="store-roof" d="M11 27 18 10h36l7 17Z"/><path className="awning-light" d="M12 27h12v9c-7 4-12 0-12-5Z"/><path className="awning-dark" d="M24 27h12v9c-7 4-12 0-12-5ZM48 27h12v4c0 5-6 9-12 5Z"/><path className="store-window" d="M20 42h12v12H20z"/><path className="store-door" d="M39 39h12v22H39z"/><circle className="store-handle" cx="48" cy="50" r="1.7"/></svg>;
}

function ConvertibleIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 90 72" aria-hidden="true" {...props}><path className="icon-shadow" d="M8 63c16 4 54 4 72 0"/><path className="car-body" d="M7 42h18l10-8h24l11 8h10c4 0 7 4 7 8v7H4v-8c0-4 1-6 3-7Z"/><path className="windscreen" d="m59 35-7-14h-8"/><path className="seat" d="M33 35v-7c0-4 8-4 8 0v7M47 35v-8c0-4 8-4 8 0v8"/><path className="car-light" d="M7 44h11M72 44h12"/><path className="car-trim" d="M8 50h74"/><circle className="wheel" cx="23" cy="57" r="8"/><circle className="wheel" cx="68" cy="57" r="8"/><circle className="wheel-hub" cx="23" cy="57" r="3"/><circle className="wheel-hub" cx="68" cy="57" r="3"/></svg>;
}
