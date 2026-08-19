import { useState, type SVGProps } from "react";
import { JUMP_UP_GAME, OCEAN_RUN_GAME, type OceanMode, type OceanZoneId } from "../../domain/ocean";
import type { MiniGameResult } from "../../domain/types";

interface OceanHubProps {
  mode: OceanMode;
  highScores: Record<string, number>;
  onModeChange(mode: OceanMode): void;
  onZoneChange(zone: OceanZoneId): void;
  onStartGame(id: MiniGameResult["gameId"]): void;
}

export function OceanHub({ mode, highScores, onModeChange, onZoneChange, onStartGame }: OceanHubProps) {
  const [gamesOpen, setGamesOpen] = useState(false);

  const toggleGames = () => {
    onModeChange("exploration");
    setGamesOpen(mode === "exploration" ? !gamesOpen : true);
  };

  return (
    <aside className="ocean-hub" aria-label="Ocean 빠른 메뉴">
      {gamesOpen && (
        <section className="ocean-explore-drawer ocean-games-board" aria-label="Games 선택">
          <header><div><span>CHOOSE A GAME</span><strong>Games</strong><small>2 GAMES</small></div><button aria-label="Games 닫기" onClick={() => setGamesOpen(false)}>×</button></header>
          <div className="ocean-game-choice-grid">
            <article className="ocean-game-choice ocean-run-card">
              <OceanRunThumbnail />
              <div><span>BEACH TO ABYSS</span><h3>Ocean Run</h3><p>해변에서 심해까지 달리고 서핑하며 장애물을 피하세요.</p></div>
              <small className="ocean-game-best">BEST {(highScores[OCEAN_RUN_GAME.id] ?? 0).toLocaleString()}</small>
              <button data-testid="start-ocean-run" onClick={() => { onZoneChange("beach"); setGamesOpen(false); onStartGame(OCEAN_RUN_GAME.id); }}><span>PLAY</span><strong>RUN →</strong></button>
            </article>
            <article className="ocean-game-choice jump-up-card">
              <JumpUpThumbnail />
              <div><span>BEACH TO SPACE</span><h3>Jump Up</h3><p>발판을 연속으로 밟고 DHA를 모아 우주까지 올라가세요.</p></div>
              <small className="ocean-game-best">BEST {(highScores[JUMP_UP_GAME.id] ?? 0).toLocaleString()}</small>
              <button data-testid="start-jump-up" onClick={() => { onZoneChange("beach"); setGamesOpen(false); onStartGame(JUMP_UP_GAME.id); }}><span>PLAY</span><strong>UP ↑</strong></button>
            </article>
          </div>
        </section>
      )}

      <nav className="ocean-action-dock" aria-label="Ocean 하단 메뉴">
        <button className={`ocean-action-button explore ${mode === "exploration" ? "active" : ""}`} aria-expanded={gamesOpen} aria-current={mode === "exploration" ? "page" : undefined} onClick={toggleGames}>
          <span className="ocean-action-visual"><SurfboardIcon /></span><strong>Games</strong>
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

function JumpUpThumbnail() {
  return <svg className="ocean-run-thumb jump-up-thumb" viewBox="0 0 340 118" aria-hidden="true"><defs><linearGradient id="jump-sky" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#ffd77f"/><stop offset=".5" stopColor="#74d8db"/><stop offset="1" stopColor="#171b51"/></linearGradient></defs><rect width="340" height="118" rx="20" fill="url(#jump-sky)"/><g fill="#fff" opacity=".82"><ellipse cx="52" cy="91" rx="46" ry="12"/><ellipse cx="275" cy="75" rx="43" ry="10"/></g><g fill="#ffe06e" stroke="#fff6c9" strokeWidth="2"><rect x="36" y="91" width="76" height="10" rx="5"/><rect x="137" y="70" width="70" height="10" rx="5"/><rect x="230" y="47" width="66" height="10" rx="5"/><rect x="140" y="23" width="62" height="10" rx="5"/></g><g transform="translate(166 66)"><ellipse cx="0" cy="8" rx="18" ry="15" fill="#f5eee4"/><circle cx="0" cy="-8" r="13" fill="#f5eee4"/><ellipse cx="-12" cy="-8" rx="6" ry="12" fill="#d6bca4"/><ellipse cx="12" cy="-8" rx="6" ry="12" fill="#d6bca4"/><circle cx="-5" cy="-10" r="2" fill="#173d48"/><circle cx="5" cy="-10" r="2" fill="#173d48"/></g><g transform="translate(263 31) rotate(-12)"><rect x="-16" y="-8" width="32" height="16" rx="8" fill="#53d7cb"/><path d="M0-8v16" stroke="#fff" strokeWidth="2"/><path d="M0-8h8a8 8 0 0 1 0 16H0Z" fill="#ffca68"/></g><circle cx="303" cy="20" r="9" fill="#a7a7ff"/><g fill="#d8ffff"><circle cx="34" cy="24" r="2"/><circle cx="85" cy="14" r="1.5"/><circle cx="238" cy="14" r="2"/><circle cx="316" cy="53" r="1.5"/></g></svg>;
}

function SurfboardIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 72 72" aria-hidden="true" {...props}><defs><linearGradient id="surfboard-paint" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe27b"/><stop offset=".52" stopColor="#ff936f"/><stop offset="1" stopColor="#42c9c2"/></linearGradient></defs><path className="icon-shadow" d="M21 61c10 5 31 2 39-5"/><path className="board" d="M17 55C15 39 25 15 38 7c5-3 10-1 11 5 3 16-8 39-20 48-5 4-11 1-12-5Z"/><path className="board-stripe" d="m21 45 24-23M20 51l25-24"/><path className="board-line" d="M35 10c-1 14-7 32-16 44"/><path className="fin" d="m30 59 7 6-10-2"/></svg>;
}

function ConvertibleIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 90 72" aria-hidden="true" {...props}><path className="icon-shadow" d="M8 63c16 4 54 4 72 0"/><path className="car-body" d="M7 42h18l10-8h24l11 8h10c4 0 7 4 7 8v7H4v-8c0-4 1-6 3-7Z"/><path className="windscreen" d="m59 35-7-14h-8"/><path className="seat" d="M33 35v-7c0-4 8-4 8 0v7M47 35v-8c0-4 8-4 8 0v8"/><path className="car-light" d="M7 44h11M72 44h12"/><path className="car-trim" d="M8 50h74"/><circle className="wheel" cx="23" cy="57" r="8"/><circle className="wheel" cx="68" cy="57" r="8"/><circle className="wheel-hub" cx="23" cy="57" r="3"/><circle className="wheel-hub" cx="68" cy="57" r="3"/></svg>;
}
