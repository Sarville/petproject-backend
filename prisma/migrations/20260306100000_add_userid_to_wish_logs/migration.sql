ALTER TABLE "wish_logs" ADD COLUMN "userId" UUID;

UPDATE "wish_logs" wl
SET "userId" = w."userId"
FROM "wishes" w
WHERE wl."wishId" = w.id;
