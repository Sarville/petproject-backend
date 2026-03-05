-- CreateTable
CREATE TABLE "request_logs" (
    "id" UUID NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "url" TEXT NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);
