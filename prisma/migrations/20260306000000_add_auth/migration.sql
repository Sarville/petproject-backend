-- Create UserRole enum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- Create users table
CREATE TABLE "users" (
    "id"           UUID         NOT NULL,
    "email"        VARCHAR(255) NOT NULL,
    "passwordHash" TEXT,
    "googleId"     VARCHAR(100),
    "role"         "UserRole"   NOT NULL DEFAULT 'USER',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key"    ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- Clear existing wishes (no owner to assign them to)
DELETE FROM "wishes";

-- Add userId as non-nullable with FK
ALTER TABLE "wishes" ADD COLUMN "userId" UUID NOT NULL;

ALTER TABLE "wishes" ADD CONSTRAINT "wishes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
