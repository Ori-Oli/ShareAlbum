import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from './auth.constants';
import { SessionService } from './session.service';
import { SocialAuthService } from './social-auth.service';
import type { SocialProvider } from './types';

const providers = new Set<SocialProvider>(['kakao', 'naver']);

@Controller('auth')
export class AuthController {
  constructor(
    private readonly socialAuthService: SocialAuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Get(':provider/login')
  login(
    @Param('provider') provider: string,
    @Query('next') nextPath: string | undefined,
    @Res() response: Response,
  ) {
    const socialProvider = parseProvider(provider);
    const state = randomUUID();
    const authorizationUrl = this.socialAuthService.getAuthorizationUrl(
      socialProvider,
      state,
    );

    response.cookie(getStateCookieName(socialProvider), state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 5,
      path: '/',
    });

    if (isSafeRedirectPath(nextPath)) {
      response.cookie(getNextCookieName(socialProvider), nextPath, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 5,
        path: '/',
      });
    }

    return response.redirect(authorizationUrl);
  }

  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const socialProvider = parseProvider(provider);

    if (!code || !state) {
      throw new BadRequestException('Missing OAuth callback parameters.');
    }

    const stateCookieName = getStateCookieName(socialProvider);
    const nextCookieName = getNextCookieName(socialProvider);
    const expectedState = request.cookies?.[stateCookieName] as
      | string
      | undefined;
    const nextPath = request.cookies?.[nextCookieName] as string | undefined;

    if (!expectedState || expectedState !== state) {
      throw new BadRequestException('Invalid OAuth state.');
    }

    const user = await this.socialAuthService.handleCallback(
      socialProvider,
      code,
    );
    const sessionToken = await this.sessionService.createToken({
      userId: user.id,
    });

    response.clearCookie(stateCookieName, { path: '/' });
    response.clearCookie(nextCookieName, { path: '/' });
    response.cookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * SESSION_MAX_AGE_SECONDS,
      path: '/',
    });

    return response.redirect(getRedirectUrl(nextPath));
  }

  @Get('me')
  async me(@Req() request: Request) {
    const token = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    if (!token) {
      return { user: null };
    }

    try {
      const session = await this.sessionService.verifyToken(token);

      return {
        user: {
          id: session.userId,
        },
      };
    } catch {
      return { user: null };
    }
  }

  @Get('logout')
  logout(@Res() response: Response) {
    response.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

    return response.redirect(process.env.WEB_ORIGIN ?? 'http://localhost:3000');
  }
}

function parseProvider(provider: string): SocialProvider {
  if (providers.has(provider as SocialProvider)) {
    return provider as SocialProvider;
  }

  throw new BadRequestException('Unsupported social login provider.');
}

function getStateCookieName(provider: SocialProvider) {
  return `share_album_${provider}_oauth_state`;
}

function getNextCookieName(provider: SocialProvider) {
  return `share_album_${provider}_oauth_next`;
}

function isSafeRedirectPath(value: string | undefined) {
  return Boolean(value?.startsWith('/') && !value.startsWith('//'));
}

function getRedirectUrl(nextPath: string | undefined) {
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

  if (!isSafeRedirectPath(nextPath)) {
    return webOrigin;
  }

  return new URL(nextPath as string, webOrigin).toString();
}
