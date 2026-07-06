import type { OAuthProvider } from '@prisma/client';

export class CreateUserDto {
  email?: string;
  displayName!: string;
  avatarUrl?: string;
  provider?: OAuthProvider;
  providerId?: string;
}
