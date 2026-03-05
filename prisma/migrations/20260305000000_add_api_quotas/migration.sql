CREATE TABLE "api_quotas" (
  "api"        VARCHAR(20) NOT NULL,
  "quotaLeft"  INTEGER NOT NULL,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_quotas_pkey" PRIMARY KEY ("api")
);
