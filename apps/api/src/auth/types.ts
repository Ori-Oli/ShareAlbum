import type { OAuthProvider } from '@prisma/client';

export type SocialProvider = 'kakao' | 'naver';

export type SocialProfile = {
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
};
