export type HealthStatus = {
  status: "ok";
  service: string;
  timestamp: string;
};

export type OAuthProvider = "KAKAO" | "NAVER";

export type GroupRole = "OWNER" | "MEMBER";

export type UserSummary = {
  id: string;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  provider?: OAuthProvider | null;
  createdAt: string;
};

export type GroupSummary = {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
};

export type AlbumSummary = {
  id: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  ownerId: string;
  groupId?: string | null;
  createdAt: string;
};
