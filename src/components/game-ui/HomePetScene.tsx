import { useEffect, useRef, useState } from "react";
import type { PetProfile } from "../../domain/pet";
import type { RoomId } from "../../domain/types";
import { gameBridge } from "../../game/bridge/GameBridge";
import { PetAvatar } from "../pet/PetAvatar";
import { PetResearchChat } from "./PetResearchChat";

const PET_PLACE_MENU = [
  { id: "hospital", icon: "✚", label: "동물병원", caption: "진료기록과 건강정보", overlay: "pet-hospital" },
  { id: "diary", icon: "✎", label: "펫 일기", caption: "사진과 추억 기록", overlay: "pet-diary" },
  { id: "exploration", icon: "⌖", label: "펫의 탐험", caption: "함께한 장소 지도", overlay: "pet-exploration" },
  { id: "grooming", icon: "✂", label: "미용실", caption: "목욕과 그루밍" },
  { id: "shop", icon: "◈", label: "반려동물 영양제 추천", caption: "AI 맞춤 영양 분석", overlay: "pet-supplement" }
] as const;

type PetReaction = "happy" | "eat" | "sleep" | "wash" | "jump" | null;

type PetPlaceOverlay = "pet-hospital" | "pet-diary" | "pet-exploration" | "pet-supplement";

export function HomePetScene({ appearance, reducedMotion, onRoomChange, onOpenPlace }: { appearance: PetProfile; reducedMotion: boolean; onRoomChange(room: RoomId): void; onOpenPlace(overlay: PetPlaceOverlay): void }) {
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
        onClick={() => {
          setSelectedPlace(place);
          react("happy");
          if ("overlay" in place) onOpenPlace(place.overlay);
        }}
      ><b aria-hidden="true">{place.icon}</b><span><strong>{place.label}</strong><small>{place.caption}</small></span></button>)}
    </nav>
    <PetResearchChat pet={appearance} />
    {(["kitchen", "bathroom", "bedroom", "wardrobe"] as const).map((room) => <button key={room} className="sr-only" data-testid={`home-static-room-${room}`} onClick={() => onRoomChange(room)}>{room} 이동</button>)}
  </div>;
}
