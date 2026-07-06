import { Injectable } from '@nestjs/common';
import type { HealthStatus } from '@share-album/shared';

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'share-album-api',
      timestamp: new Date().toISOString(),
    };
  }
}
