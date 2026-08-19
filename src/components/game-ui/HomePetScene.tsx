import { useEffect, useRef, useState } from "react";
import type { PetProfile } from "../../domain/pet";
import type { RoomId } from "../../domain/types";
import { gameBridge } from "../../game/bridge/GameBridge";
import { PetAvatar } from "../pet/PetAvatar";

const PET_PLACE_MENU = [
  { id: "hospital", icon: "✚", label: "동물병원", caption: "건강 기록과 진료" },
  { id: "cafe", icon: "☕", label: "애견 카페", caption: "친구들과 교감" },
  { id: "walk", icon: "♧", label: "산책로", caption: "산책과 탐험" },
  { id: "grooming", icon: "✂", label: "미용실", caption: "목욕과 그루밍" },
  { id: "shop", icon: "◈", label: "펫샵", caption: "용품과 스타일" }
] as const;

type PetReaction = "happy" | "eat" | "sleep" | "wash" | "jump" | null;

export function HomePetScene({ appearance, reducedMotion, onRoomChange }: { appearance: PetProfile; reducedMotion: boolean; onRoomChange(room: RoomId): void }) {
  const [selectedPlace, setSelectedPlace] = useState<(typeof PET_PLACE_MENU)[number]>(PET_PLACE_MENU[2]);
  const [reaction, setReaction] = useState<PetReaction>(null);
  const reactionTimer = useRef<number | null>(null);

  const react = (next: Exclude<PetReaction, null>) => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    setReaction(next);
    reactionTimer.current = window.setTimeout(() => setReaction(null), next === "sleep" ? 2_600 : 1_400);
  };

  useEffect(() => {
    const stop = gameBridge.on("pet:react", ({ action }) => {
      react(action === "feed" ? "eat" : action === "sleep" ? "sleep" : action === "wash" ? "wash" : action === "play" ? "jump" : "happy");
    });
    return () => {
      stop();
      if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    };
  }, []);

  return <div
    className={`home-pet-scene${reducedMotion ? " is-reduced" : ""}`}
    data-testid="home-pet-scene"
    data-species={appearance.species}
    data-breed={appearance.breed}
    data-fur-color={appearance.furColor}
    data-pattern={appearance.pattern}
    data-accessory={appearance.accessory}
    data-outfit={appearance.outfit}
  >
    <div className="home-pet-room" aria-hidden="true">
      <div className="home-pet-window"><i /><b /><span /></div>
      <div className="home-pet-plant"><i /><i /><i /><i /><b /></div>
      <div className="home-pet-wall-art"><i /><b /></div>
      <div className="home-pet-floor-light" />
    </div>
    <div className="home-pet-focus">
      <button className={`home-pet-touch reaction-${reaction ?? "idle"}`} type="button" aria-label={`${appearance.name} 쓰다듬기`} onClick={() => react("happy")}>
        <div className="home-pet-avatar-scale"><PetAvatar appearance={appearance} className="home-pet-avatar" testId="home-pet-avatar" /></div>
        <span className="home-pet-cushion" aria-hidden="true"><i /><i /><b /></span>
      </button>
      <p className="home-pet-greeting"><strong>{appearance.name}</strong><span>방석에서 편안하게 쉬고 있어요</span></p>
    </div>
    <nav className="pet-place-menu" aria-label="반려동물 장소">
      <span className="pet-place-menu-title">PET PLACES</span>
      {PET_PLACE_MENU.map((place) => <button
        key={place.id}
        type="button"
        className={selectedPlace.id === place.id ? "active" : ""}
        aria-label={`${place.label}: ${place.caption}`}
        aria-pressed={selectedPlace.id === place.id}
        data-testid={`pet-place-${place.id}`}
        onClick={() => { setSelectedPlace(place); react("happy"); }}
      ><b aria-hidden="true">{place.icon}</b><span><strong>{place.label}</strong><small>{place.caption}</small></span></button>)}
    </nav>
    {(["kitchen", "bathroom", "bedroom", "wardrobe"] as const).map((room) => <button key={room} className="sr-only" data-testid={`home-static-room-${room}`} onClick={() => onRoomChange(room)}>{room} 이동</button>)}
  </div>;
}
