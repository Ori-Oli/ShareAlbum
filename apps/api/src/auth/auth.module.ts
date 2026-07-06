import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SessionService } from './session.service';
import { SocialAuthService } from './social-auth.service';

@Module({
  controllers: [AuthController],
  providers: [SessionService, SocialAuthService],
  exports: [SessionService],
})
export class AuthModule {}
