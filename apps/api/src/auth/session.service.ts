import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { SESSION_MAX_AGE_SECONDS } from './auth.constants';

export type AppSessionPayload = {
  userId: string;
};

@Injectable()
export class SessionService {
  private readonly secret = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'dev-session-secret-change-me',
  );

  createToken(payload: AppSessionPayload) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
      .sign(this.secret);
  }

  async verifyToken(token: string) {
    const { payload } = await jwtVerify(token, this.secret);

    return payload as AppSessionPayload;
  }
}
