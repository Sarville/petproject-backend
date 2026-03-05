-- CreateEnum
CREATE TYPE "LogAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- AlterTable: shrink title from 255 to 50
ALTER TABLE "wishes" ALTER COLUMN "title" TYPE VARCHAR(50);

-- CreateTable
CREATE TABLE "wish_logs" (
    "id" UUID NOT NULL,
    "action" "LogAction" NOT NULL,
    "wishId" UUID NOT NULL,
    "wishTitle" VARCHAR(50) NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wish_logs_pkey" PRIMARY KEY ("id")
);
