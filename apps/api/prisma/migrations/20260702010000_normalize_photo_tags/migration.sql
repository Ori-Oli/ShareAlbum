CREATE TYPE "TagSource" AS ENUM ('AI', 'USER');

CREATE TABLE "tags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

INSERT INTO "tags" ("name")
SELECT DISTINCT "name"
FROM "photo_tags"
WHERE "name" IS NOT NULL AND btrim("name") <> ''
ON CONFLICT ("name") DO NOTHING;

ALTER TABLE "photo_tags"
  ADD COLUMN "tagId" UUID,
  ADD COLUMN "source" "TagSource" NOT NULL DEFAULT 'AI',
  ADD COLUMN "createdBy" UUID;

UPDATE "photo_tags" AS "photoTag"
SET "tagId" = "tag"."id"
FROM "tags" AS "tag"
WHERE "photoTag"."name" = "tag"."name";

ALTER TABLE "photo_tags"
  ALTER COLUMN "tagId" SET NOT NULL;

DROP INDEX "photo_tags_photoId_name_key";

ALTER TABLE "photo_tags"
  DROP COLUMN "name";

CREATE UNIQUE INDEX "photo_tags_photoId_tagId_key" ON "photo_tags"("photoId", "tagId");
CREATE INDEX "photo_tags_tagId_idx" ON "photo_tags"("tagId");
CREATE INDEX "photo_tags_createdBy_idx" ON "photo_tags"("createdBy");

ALTER TABLE "photo_tags"
  ADD CONSTRAINT "photo_tags_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "tags"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "photo_tags"
  ADD CONSTRAINT "photo_tags_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
