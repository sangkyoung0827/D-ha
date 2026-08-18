import { useState, type CSSProperties, type SVGProps } from "react";
import { OCEAN_ZONES, isOceanZoneUnlocked, type OceanMode, type OceanZoneId } from "../../domain/ocean";
import type { MiniGameId, MiniGameResult } from "../../domain/types";

interface OceanHubProps {
  mode: OceanMode;
  zone: OceanZoneId;
  highScores: Record<string, number>;
  onModeChange(mode: OceanMode): void;
  onZoneChange(zone: OceanZoneId): void;
  onStartGame(id: MiniGameResult["gameId"]): void;
  onOpenShop(): void;
}

export function OceanHub({ mode, highScores, onModeChange, onZoneChange, onStartGame, onOpenShop }: OceanHubProps) {
  const [gamesOpen, setGamesOpen] = useState(false);
  const games = OCEAN_ZONES.flatMap((oceanZone) => oceanZone.games.map((game) => ({ game, oceanZone, unlocked: isOceanZoneUnlocked(oceanZone.id, highScores) })));
  const unlockedCount = games.filter((item) => item.unlocked).length;

  const toggleGames = () => {
    onModeChange("exploration");
    setGamesOpen(mode === "exploration" ? !gamesOpen : true);
  };

  return (
    <aside className="ocean-hub" aria-label="Ocean 빠른 메뉴">
      {gamesOpen && (
        <section className="ocean-explore-drawer ocean-games-board" aria-label="Games 선택">
          <header><div><span>OCEAN ARCADE</span><strong>Games</strong><small>{unlockedCount}/{games.length} OPEN</small></div><button aria-label="Games 닫기" onClick={() => setGamesOpen(false)}>×</button></header>
          <div className="ocean-games-grid">
            {games.map(({ game, oceanZone, unlocked }) => <button key={game.id} className={unlocked ? "" : "locked"} data-testid={`start-${game.id}`} disabled={!unlocked} style={{ "--game-accent": game.accent } as CSSProperties} onClick={() => { onZoneChange(oceanZone.id); setGamesOpen(false); onStartGame(game.id); }}><OceanGameThumbnail id={game.id} /><strong>{game.shortTitle}</strong><small>{oceanZone.title} · {oceanZone.depth}</small>{!unlocked && <b>LOCK</b>}</button>)}
          </div>
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

function OceanGameThumbnail({ id }: { id: MiniGameId }) {
  if (id === "beach-volleyball") return <svg className="ocean-game-thumb" viewBox="0 0 100 72" aria-hidden="true"><rect width="100" height="45" rx="11" fill="#8edfdc"/><rect y="43" width="100" height="29" rx="11" fill="#f4d58f"/><circle cx="78" cy="15" r="8" fill="#ffd567"/><path d="M19 26v30M71 26v30M19 29h52M19 38h52M19 47h52M29 29v22M39 29v22M49 29v22M59 29v22" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".9"/><circle cx="48" cy="19" r="7" fill="#ff8b70" stroke="#fff" strokeWidth="2"/><path d="m43 17 10 4m-6-8 2 12" stroke="#ffe97c" strokeWidth="2"/></svg>;
  if (id === "beach-pingpong") return <svg className="ocean-game-thumb" viewBox="0 0 100 72" aria-hidden="true"><rect width="100" height="72" rx="11" fill="#fff0c7"/><path d="M14 30h72L76 58H24Z" fill="#42a99c" stroke="#176875" strokeWidth="2"/><path d="M50 30v28M16 38h68" stroke="#fff" strokeWidth="2"/><path d="M25 54v12m50-12v12" stroke="#355b62" strokeWidth="3"/><circle cx="41" cy="23" r="4" fill="#fff" stroke="#e3a64b" strokeWidth="1.5"/><circle cx="76" cy="19" r="11" fill="#ec7668"/><path d="m69 27-7 9" stroke="#714a3c" strokeWidth="5" strokeLinecap="round"/></svg>;
  if (id === "beach-football") return <svg className="ocean-game-thumb" viewBox="0 0 100 72" aria-hidden="true"><rect width="100" height="72" rx="11" fill="#f2d38c"/><path d="M17 16h66v40H17zM17 26h66M29 16v40m14-40v40m14-40v40m14-40v40" fill="none" stroke="#fff" strokeWidth="2" opacity=".85"/><circle cx="50" cy="55" r="12" fill="#fdfbf3" stroke="#263f49" strokeWidth="1.8"/><path d="m50 48 5 4-2 6h-6l-2-6Zm-5 4-5-2m15 2 5-2m-7 8 3 4m-9-4-3 4" fill="#263f49" stroke="#263f49" strokeWidth="1.2"/></svg>;
  if (id === "open-water-catch") return <svg className="ocean-game-thumb" viewBox="0 0 100 72" aria-hidden="true"><rect width="100" height="72" rx="11" fill="#31a9bf"/><path d="M0 17c17 7 33-6 50 0s33-7 50 0M0 31c17 7 33-6 50 0s33-7 50 0" fill="none" stroke="#aef3e7" strokeWidth="3" opacity=".55"/><ellipse cx="67" cy="41" rx="17" ry="10" fill="#ffd166" stroke="#fff" strokeWidth="2"/><path d="m52 41-12-9v18Z" fill="#ef8a65"/><circle cx="74" cy="38" r="1.8" fill="#173d48"/><ellipse cx="27" cy="52" rx="16" ry="7" fill="#ffe084"/><circle cx="15" cy="50" r="6" fill="#c98563"/><path d="m36 52 9-7m-9 7 9 7" stroke="#68e0d4" strokeWidth="4" strokeLinecap="round"/></svg>;
  if (id === "reef-surf") return <svg className="ocean-game-thumb" viewBox="0 0 100 72" aria-hidden="true"><rect width="100" height="72" rx="11" fill="#217fa5"/><path d="M-6 48c20-18 37-18 56 0s38 18 58 0v25H-6Z" fill="#75dcd4"/><path d="M-4 54c20-16 36-16 54 0s38 16 57 0" fill="none" stroke="#effff9" strokeWidth="5"/><path d="M64 48 75 29l12 19Z" fill="#173e54"/><ellipse cx="39" cy="45" rx="24" ry="5" fill="#ffc75d" stroke="#fff" strokeWidth="2" transform="rotate(-12 39 45)"/><circle cx="39" cy="23" r="6" fill="#c98263"/><path d="m39 29-6 14m6-14 9 10" stroke="#54d0c6" strokeWidth="5" strokeLinecap="round"/></svg>;
  if (id === "cave-sonar") return <svg className="ocean-game-thumb" viewBox="0 0 100 72" aria-hidden="true"><rect width="100" height="72" rx="11" fill="#182342"/><path d="M0 0h27l-9 13 10 12-15 12 11 13L0 63Zm100 0H75l8 15-11 12 17 12-10 14 21 11Z" fill="#080f25"/><circle cx="50" cy="35" r="7" fill="#72e2d1"/><circle cx="50" cy="35" r="15" fill="none" stroke="#9b91e0" strokeWidth="2"/><circle cx="50" cy="35" r="25" fill="none" stroke="#72e2d1" strokeWidth="1.5" opacity=".7"/><circle cx="36" cy="17" r="3" fill="#f1cf70"/><circle cx="68" cy="52" r="3" fill="#c09df2"/></svg>;
  if (id === "deepsea-descent") return <svg className="ocean-game-thumb" viewBox="0 0 100 72" aria-hidden="true"><rect width="100" height="72" rx="11" fill="#07132f"/><g fill="#73ded3"><circle cx="16" cy="14" r="1.4"/><circle cx="82" cy="18" r="2"/><circle cx="68" cy="57" r="1.3"/><circle cx="26" cy="49" r="2"/></g><ellipse cx="47" cy="37" rx="22" ry="13" fill="#f0c65d" stroke="#fff4c9" strokeWidth="2"/><rect x="38" y="30" width="18" height="13" rx="5" fill="#254c6b"/><circle cx="47" cy="36" r="4" fill="#91e8df"/><path d="m25 37-10-8v16Zm44 0 25-14v28Z" fill="#6678a7"/><path d="m69 37 27-13v26Z" fill="#ffe889" opacity=".28"/></svg>;
  return <svg className="ocean-game-thumb" viewBox="0 0 100 72" aria-hidden="true"><rect width="100" height="72" rx="11" fill="#dff3ec"/><circle cx="50" cy="36" r="18" fill="#54c9bd"/></svg>;
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
