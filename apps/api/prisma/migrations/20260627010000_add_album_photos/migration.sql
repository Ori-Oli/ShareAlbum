CREATE TABLE "photos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "albumId" UUID NOT NULL,
  "uploaderId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "photos_albumId_idx" ON "photos"("albumId");
CREATE INDEX "photos_uploaderId_idx" ON "photos"("uploaderId");

ALTER TABLE "photos"
  ADD CONSTRAINT "photos_albumId_fkey"
  FOREIGN KEY ("albumId") REFERENCES "albums"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "photos"
  ADD CONSTRAINT "photos_uploaderId_fkey"
  FOREIGN KEY ("uploaderId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
