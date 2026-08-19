export type PetSpecies = "dog" | "cat";

export type PetBreed =
  | "maltese"
  | "poodle"
  | "pomeranian"
  | "bichon"
  | "goldenRetriever"
  | "koreanShorthair"
  | "russianBlue"
  | "britishShorthair"
  | "persian"
  | "siamese";

export type FurColor = "snow" | "cream" | "apricot" | "golden" | "cocoa" | "charcoal" | "blue" | "seal";
export type PetPattern = "solid" | "bicolor" | "tabby" | "spotted" | "points";
export type PetCollar = "none" | "teal" | "coral" | "navy" | "gold";
export type PetHat = "none" | "cap" | "beanie" | "sunhat";
export type PetAccessory = "none" | "round" | "square" | "sunglasses" | "bandana";
export type PetOutfit = "none" | "tee" | "hoodie" | "sailor" | "raincoat";
export type PetAnimation = "idle" | "walk" | "run" | "eat" | "sleep" | "wash" | "happy" | "tired" | "jump";

export const PET_ANIMATIONS: readonly PetAnimation[] = ["idle", "walk", "run", "eat", "sleep", "wash", "happy", "tired", "jump"];

export interface PetAppearance {
  species: PetSpecies;
  breed: PetBreed;
  furColor: FurColor;
  pattern: PetPattern;
  collar: PetCollar;
  hat: PetHat;
  accessory: PetAccessory;
  outfit: PetOutfit;
}

export interface PetProfile extends PetAppearance {
  name: string;
}

export interface PetOption<T extends string> {
  id: T;
  label: string;
  color?: string;
}

export interface BreedDefinition {
  id: PetBreed;
  species: PetSpecies;
  label: string;
  defaultFur: FurColor;
  defaultPattern: PetPattern;
  coat: "silky" | "curly" | "fluffy" | "short" | "long";
  ears: "drop" | "round" | "pointed";
  muzzle: "short" | "medium" | "long";
  size: "small" | "medium" | "large";
}

export const PET_BREEDS: readonly BreedDefinition[] = [
  { id: "maltese", species: "dog", label: "말티즈", defaultFur: "snow", defaultPattern: "solid", coat: "silky", ears: "drop", muzzle: "short", size: "small" },
  { id: "poodle", species: "dog", label: "푸들", defaultFur: "apricot", defaultPattern: "solid", coat: "curly", ears: "drop", muzzle: "medium", size: "medium" },
  { id: "pomeranian", species: "dog", label: "포메라니안", defaultFur: "golden", defaultPattern: "solid", coat: "fluffy", ears: "pointed", muzzle: "short", size: "small" },
  { id: "bichon", species: "dog", label: "비숑 프리제", defaultFur: "snow", defaultPattern: "solid", coat: "curly", ears: "drop", muzzle: "short", size: "small" },
  { id: "goldenRetriever", species: "dog", label: "골든 리트리버", defaultFur: "golden", defaultPattern: "solid", coat: "silky", ears: "drop", muzzle: "long", size: "large" },
  { id: "koreanShorthair", species: "cat", label: "코리안 숏헤어", defaultFur: "cream", defaultPattern: "tabby", coat: "short", ears: "pointed", muzzle: "medium", size: "medium" },
  { id: "russianBlue", species: "cat", label: "러시안 블루", defaultFur: "blue", defaultPattern: "solid", coat: "short", ears: "pointed", muzzle: "short", size: "medium" },
  { id: "britishShorthair", species: "cat", label: "브리티시 숏헤어", defaultFur: "blue", defaultPattern: "solid", coat: "short", ears: "round", muzzle: "short", size: "medium" },
  { id: "persian", species: "cat", label: "페르시안", defaultFur: "snow", defaultPattern: "solid", coat: "long", ears: "round", muzzle: "short", size: "medium" },
  { id: "siamese", species: "cat", label: "샴", defaultFur: "cream", defaultPattern: "points", coat: "short", ears: "pointed", muzzle: "medium", size: "medium" }
];

export const FUR_COLORS: readonly PetOption<FurColor>[] = [
  { id: "snow", label: "스노우", color: "#f5f0e5" },
  { id: "cream", label: "크림", color: "#e8cfaa" },
  { id: "apricot", label: "애프리콧", color: "#c98250" },
  { id: "golden", label: "골든", color: "#c99a52" },
  { id: "cocoa", label: "코코아", color: "#704a36" },
  { id: "charcoal", label: "차콜", color: "#353b3e" },
  { id: "blue", label: "블루 그레이", color: "#7b8c94" },
  { id: "seal", label: "씰 브라운", color: "#4b362f" }
];

export const PET_PATTERNS: readonly PetOption<PetPattern>[] = [
  { id: "solid", label: "단색" },
  { id: "bicolor", label: "바이컬러" },
  { id: "tabby", label: "태비" },
  { id: "spotted", label: "스팟" },
  { id: "points", label: "포인트" }
];

export const PET_COLLARS: readonly PetOption<PetCollar>[] = [
  { id: "none", label: "목걸이 없음" },
  { id: "teal", label: "민트", color: "#27a6a1" },
  { id: "coral", label: "코랄", color: "#ef7c6e" },
  { id: "navy", label: "네이비", color: "#244b66" },
  { id: "gold", label: "골드", color: "#d5a73e" }
];

export const PET_HATS: readonly PetOption<PetHat>[] = [
  { id: "none", label: "모자 없음" },
  { id: "cap", label: "캡" },
  { id: "beanie", label: "비니" },
  { id: "sunhat", label: "선햇" }
];

export const PET_ACCESSORIES: readonly PetOption<PetAccessory>[] = [
  { id: "none", label: "액세서리 없음" },
  { id: "round", label: "동그란 안경" },
  { id: "square", label: "사각 안경" },
  { id: "sunglasses", label: "선글라스" },
  { id: "bandana", label: "반다나" }
];

export const PET_OUTFITS: readonly PetOption<PetOutfit>[] = [
  { id: "none", label: "털 그대로" },
  { id: "tee", label: "티셔츠" },
  { id: "hoodie", label: "후디" },
  { id: "sailor", label: "마린룩" },
  { id: "raincoat", label: "레인코트" }
];

export const COLLAR_COLORS: Record<Exclude<PetCollar, "none">, string> = {
  teal: "#27a6a1",
  coral: "#ef7c6e",
  navy: "#244b66",
  gold: "#d5a73e"
};

export const OUTFIT_COLORS: Record<Exclude<PetOutfit, "none">, string> = {
  tee: "#f6f5ef",
  hoodie: "#64bdb5",
  sailor: "#3d6f91",
  raincoat: "#f1c84b"
};

export function breedDefinition(breed: PetBreed): BreedDefinition {
  return PET_BREEDS.find((item) => item.id === breed) ?? PET_BREEDS[0]!;
}

export function breedsForSpecies(species: PetSpecies): readonly BreedDefinition[] {
  return PET_BREEDS.filter((item) => item.species === species);
}

export function furColorValue(id: FurColor): string {
  return FUR_COLORS.find((item) => item.id === id)?.color ?? "#f5f0e5";
}

export function petDescription(appearance: PetAppearance): string {
  const breed = breedDefinition(appearance.breed);
  const fur = FUR_COLORS.find((item) => item.id === appearance.furColor)?.label ?? "스노우";
  const pattern = PET_PATTERNS.find((item) => item.id === appearance.pattern)?.label ?? "단색";
  const accessory = PET_ACCESSORIES.find((item) => item.id === appearance.accessory)?.label ?? "액세서리 없음";
  return `${breed.label}, ${fur}, ${pattern}, ${accessory}`;
}

export function petAccentColor(appearance: PetAppearance): string {
  if (appearance.pattern === "points") return "#4b362f";
  if (appearance.pattern === "bicolor") return "#f7f3ea";
  if (appearance.pattern === "tabby") return appearance.furColor === "charcoal" ? "#171c1f" : "#7a5b43";
  if (appearance.pattern === "spotted") return "#4f3d34";
  return furColorValue(appearance.furColor);
}
