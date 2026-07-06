import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: '../../.env' });
config({ path: '../../.env.local', override: true });
config({ path: '.env', override: true });
config({ path: '.env.local', override: true });

const migrationUrl = process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'];

if (!migrationUrl) {
  throw new Error('DIRECT_URL or DATABASE_URL is required to run Prisma commands.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
  },
});
