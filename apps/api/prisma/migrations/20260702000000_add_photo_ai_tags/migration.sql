CREATE TYPE "PhotoAiStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

ALTER TABLE "photos"
  ADD COLUMN "aiStatus" "PhotoAiStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "aiError" TEXT;

UPDATE "photos"
SET "aiStatus" = 'READY'
WHERE "aiStatus" = 'PENDING';

CREATE TABLE "photo_tags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "photoId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "photo_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "photo_tags_photoId_name_key" ON "photo_tags"("photoId", "name");
CREATE INDEX "photo_tags_photoId_idx" ON "photo_tags"("photoId");

ALTER TABLE "photo_tags"
  ADD CONSTRAINT "photo_tags_photoId_fkey"
  FOREIGN KEY ("photoId") REFERENCES "photos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
