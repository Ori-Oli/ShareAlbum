import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';
import { PhotoTaggingService } from './photo-tagging.service';

@Module({
  imports: [AuthModule],
  controllers: [AlbumsController],
  providers: [AlbumsService, PhotoTaggingService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
