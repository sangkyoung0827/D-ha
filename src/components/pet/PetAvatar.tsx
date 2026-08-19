import type { CSSProperties } from "react";
import { COLLAR_COLORS, OUTFIT_COLORS, breedDefinition, furColorValue, petAccentColor, petDescription, type PetAppearance } from "../../domain/pet";

type PetAvatarStyle = CSSProperties & {
  "--fur": string;
  "--accent": string;
  "--collar": string;
  "--outfit": string;
};

export function PetAvatar({ appearance, className = "", testId }: { appearance: PetAppearance; className?: string; testId?: string }) {
  const breed = breedDefinition(appearance.breed);
  const style: PetAvatarStyle = {
    "--fur": furColorValue(appearance.furColor),
    "--accent": petAccentColor(appearance),
    "--collar": appearance.collar === "none" ? "transparent" : COLLAR_COLORS[appearance.collar],
    "--outfit": appearance.outfit === "none" ? "transparent" : OUTFIT_COLORS[appearance.outfit]
  };
  return (
    <div
      className={`pet-avatar pet-${appearance.species} breed-${appearance.breed} coat-${breed.coat} pattern-${appearance.pattern} ${className}`.trim()}
      style={style}
      data-testid={testId}
      data-species={appearance.species}
      data-breed={appearance.breed}
      data-fur-color={appearance.furColor}
      data-pattern={appearance.pattern}
      data-collar={appearance.collar}
      data-hat={appearance.hat}
      data-accessory={appearance.accessory}
      data-outfit={appearance.outfit}
      role="img"
      aria-label={`반려동물 미리보기: ${petDescription(appearance)}`}
    >
      <span className="pet-tail" />
      <span className="pet-body"><i className="pet-outfit" /></span>
      <span className="pet-leg front-left" /><span className="pet-leg front-right" />
      <span className="pet-head">
        <i className="pet-ear left" /><i className="pet-ear right" />
        <b className="pet-marking" />
        <em className="pet-eye left" /><em className="pet-eye right" />
        <span className="pet-muzzle"><i /></span>
        <span className={`pet-accessory accessory-${appearance.accessory}`}><i /><i /></span>
        <span className={`pet-hat hat-${appearance.hat}`} />
      </span>
      <span className={`pet-collar collar-${appearance.collar}`}><i /></span>
    </div>
  );
}
