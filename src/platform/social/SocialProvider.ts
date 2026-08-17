export interface GameFriend {
  id: string;
  name: string;
  rank: string;
  outfitColor: string;
  theme: string;
  note: "데모 친구";
}

export interface FriendWorld {
  friend: GameFriend;
  greeting: string;
}

export interface SocialProvider {
  listFriends(): Promise<GameFriend[]>;
  visitFriend(friendId: string): Promise<FriendWorld>;
}

const FRIENDS: GameFriend[] = [
  { id: "nami", name: "나미", rank: "Coast Keeper", outfitColor: "#ef8f7c", theme: "코랄 스테이션", note: "데모 친구" },
  { id: "sol", name: "솔", rank: "Reef Keeper", outfitColor: "#5bcac2", theme: "라군 데크", note: "데모 친구" },
  { id: "mio", name: "미오", rank: "Rookie Keeper", outfitColor: "#6f8fce", theme: "미드나이트 돔", note: "데모 친구" }
];

export class LocalSocialProvider implements SocialProvider {
  async listFriends(): Promise<GameFriend[]> {
    return structuredClone(FRIENDS);
  }

  async visitFriend(friendId: string): Promise<FriendWorld> {
    const friend = FRIENDS.find((candidate) => candidate.id === friendId);
    if (!friend) throw new Error("데모 친구를 찾지 못했습니다.");
    return { friend: structuredClone(friend), greeting: `${friend.name}의 ${friend.theme}에 도착했어요.` };
  }
}

export const socialProvider = new LocalSocialProvider();
