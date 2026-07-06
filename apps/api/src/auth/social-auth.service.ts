import { Injectable } from '@nestjs/common';
import { OAuthProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SocialProfile, SocialProvider } from './types';

type TokenResponse = {
  access_token: string;
};

type KakaoProfileResponse = {
  id: number;
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
};

type NaverProfileResponse = {
  response: {
    id: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
};

@Injectable()
export class SocialAuthService {
  constructor(private readonly prisma: PrismaService) {}

  getAuthorizationUrl(provider: SocialProvider, state: string) {
    if (provider === 'kakao') {
      const url = new URL('https://kauth.kakao.com/oauth/authorize');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', requiredEnv('KAKAO_REST_API_KEY'));
      url.searchParams.set('redirect_uri', requiredEnv('KAKAO_REDIRECT_URI'));
      url.searchParams.set('state', state);

      return url.toString();
    }

    const url = new URL('https://nid.naver.com/oauth2.0/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', requiredEnv('NAVER_CLIENT_ID'));
    url.searchParams.set('redirect_uri', requiredEnv('NAVER_REDIRECT_URI'));
    url.searchParams.set('state', state);

    return url.toString();
  }

  async handleCallback(provider: SocialProvider, code: string) {
    const accessToken = await this.exchangeCodeForAccessToken(provider, code);
    const profile = await this.getProfile(provider, accessToken);

    const existingProviderUser = await this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
    });

    if (existingProviderUser) {
      return this.prisma.user.update({
        where: {
          id: existingProviderUser.id,
        },
        data: {
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        provider: profile.provider,
        providerId: profile.providerId,
      },
    });
  }

  private async exchangeCodeForAccessToken(
    provider: SocialProvider,
    code: string,
  ) {
    const tokenUrl =
      provider === 'kakao'
        ? 'https://kauth.kakao.com/oauth/token'
        : 'https://nid.naver.com/oauth2.0/token';

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id:
        provider === 'kakao'
          ? requiredEnv('KAKAO_REST_API_KEY')
          : requiredEnv('NAVER_CLIENT_ID'),
      redirect_uri:
        provider === 'kakao'
          ? requiredEnv('KAKAO_REDIRECT_URI')
          : requiredEnv('NAVER_REDIRECT_URI'),
    });

    const clientSecret =
      provider === 'kakao'
        ? process.env.KAKAO_CLIENT_SECRET
        : requiredEnv('NAVER_CLIENT_SECRET');

    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();

      throw new Error(
        `Failed to exchange ${provider} authorization code. ` +
          `Status: ${response.status}. Response: ${errorBody}`,
      );
    }

    const token = (await response.json()) as TokenResponse;

    return token.access_token;
  }

  private async getProfile(provider: SocialProvider, accessToken: string) {
    if (provider === 'kakao') {
      return this.getKakaoProfile(accessToken);
    }

    return this.getNaverProfile(accessToken);
  }

  private async getKakaoProfile(accessToken: string): Promise<SocialProfile> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Kakao profile.');
    }

    const profile = (await response.json()) as KakaoProfileResponse;
    const displayName =
      profile.kakao_account?.profile?.nickname ??
      profile.properties?.nickname ??
      '카카오 사용자';

    return {
      provider: OAuthProvider.KAKAO,
      providerId: String(profile.id),
      email: profile.kakao_account?.email,
      displayName,
      avatarUrl:
        profile.kakao_account?.profile?.profile_image_url ??
        profile.properties?.profile_image,
    };
  }

  private async getNaverProfile(accessToken: string): Promise<SocialProfile> {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Naver profile.');
    }

    const profile = (await response.json()) as NaverProfileResponse;

    return {
      provider: OAuthProvider.NAVER,
      providerId: profile.response.id,
      email: profile.response.email,
      displayName:
        profile.response.name ?? profile.response.nickname ?? '네이버 사용자',
      avatarUrl: profile.response.profile_image,
    };
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
