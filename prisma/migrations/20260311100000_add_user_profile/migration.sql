ALTER TABLE "users" ADD COLUMN "nickname" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN "avatar"   VARCHAR(100);

CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");
