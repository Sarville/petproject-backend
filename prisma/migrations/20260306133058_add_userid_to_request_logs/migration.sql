-- AlterTable
ALTER TABLE "request_logs" ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
