CREATE TABLE "photo_likes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "photoId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "photo_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "photo_likes_photoId_userId_key" ON "photo_likes"("photoId", "userId");
CREATE INDEX "photo_likes_photoId_idx" ON "photo_likes"("photoId");
CREATE INDEX "photo_likes_userId_idx" ON "photo_likes"("userId");

ALTER TABLE "photo_likes"
  ADD CONSTRAINT "photo_likes_photoId_fkey"
  FOREIGN KEY ("photoId") REFERENCES "photos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "photo_likes"
  ADD CONSTRAINT "photo_likes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
