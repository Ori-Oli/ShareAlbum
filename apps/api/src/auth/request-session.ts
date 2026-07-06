import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { SESSION_COOKIE_NAME } from './auth.constants';
import { SessionService } from './session.service';

export async function getCurrentUserIdFromRequest(
  request: Request,
  sessionService: SessionService,
) {
  const token = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

  if (!token) {
    throw new UnauthorizedException('Login is required.');
  }

  try {
    const session = await sessionService.verifyToken(token);

    return session.userId;
  } catch {
    throw new UnauthorizedException('Login is required.');
  }
}
