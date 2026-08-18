import type { CharacterAppearance, GlassesStyle, HairColor, HairStyle, SkinTone } from "./types";

export interface AppearanceOption<T extends string> {
  id: T;
  label: string;
  color?: string;
}

export const SKIN_TONES: readonly AppearanceOption<SkinTone>[] = [
  { id: "porcelain", label: "포슬린", color: "#f7d4bf" },
  { id: "sunrise", label: "피치", color: "#efb48f" },
  { id: "sand", label: "샌드", color: "#d99a72" },
  { id: "golden", label: "골든", color: "#bf7d55" },
  { id: "cocoa", label: "코코아", color: "#996044" },
  { id: "deep", label: "딥", color: "#654133" }
];

export const HAIR_STYLES: readonly AppearanceOption<HairStyle>[] = [
  { id: "straight", label: "스트레이트" },
  { id: "wave", label: "웨이브" },
  { id: "crop", label: "크롭" },
  { id: "side-part", label: "사이드 파트" },
  { id: "bob", label: "보브" },
  { id: "bun", label: "번" },
  { id: "curl", label: "컬" },
  { id: "ponytail", label: "포니테일" }
];

export const HAIR_COLORS: readonly AppearanceOption<HairColor>[] = [
  { id: "midnight", label: "미드나이트", color: "#172f3c" },
  { id: "espresso", label: "에스프레소", color: "#3d2a27" },
  { id: "chestnut", label: "체스트넛", color: "#704437" },
  { id: "caramel", label: "캐러멜", color: "#a56b3f" },
  { id: "coral", label: "코랄", color: "#a64f48" },
  { id: "silver", label: "실버", color: "#a9b9bf" }
];

export const GLASSES_STYLES: readonly AppearanceOption<GlassesStyle>[] = [
  { id: "none", label: "안경 없음" },
  { id: "round", label: "라운드" },
  { id: "square", label: "스퀘어" },
  { id: "aviator", label: "에비에이터" }
];

function findOption<T extends string>(options: readonly AppearanceOption<T>[], id: T): AppearanceOption<T> {
  return options.find((option) => option.id === id) ?? options[0]!;
}

export function skinColor(id: SkinTone): string {
  return findOption(SKIN_TONES, id).color ?? "#d99a72";
}

export function hairColor(id: HairColor): string {
  return findOption(HAIR_COLORS, id).color ?? "#172f3c";
}

export function appearanceDescription(appearance: CharacterAppearance): string {
  return [
    findOption(SKIN_TONES, appearance.skinTone).label,
    findOption(HAIR_STYLES, appearance.hairStyle).label,
    `${findOption(HAIR_COLORS, appearance.hairColor).label} 머리`,
    findOption(GLASSES_STYLES, appearance.glassesStyle).label
  ].join(", ");
}
