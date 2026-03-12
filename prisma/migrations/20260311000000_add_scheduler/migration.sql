CREATE TYPE "SchedulerRunStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

CREATE TABLE "scheduler_config" (
  "id"              TEXT    NOT NULL DEFAULT 'default',
  "enabled"         BOOLEAN NOT NULL DEFAULT true,
  "intervalType"    TEXT    NOT NULL DEFAULT 'DAILY',
  "intervalMinutes" INTEGER NOT NULL DEFAULT 60,
  "dailyHour"       INTEGER NOT NULL DEFAULT 2,
  "dailyMinute"     INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "scheduler_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scheduler_runs" (
  "id"           UUID                  NOT NULL DEFAULT gen_random_uuid(),
  "startedAt"    TIMESTAMP(3)          NOT NULL,
  "finishedAt"   TIMESTAMP(3),
  "checkedCount" INTEGER               NOT NULL DEFAULT 0,
  "updatedCount" INTEGER               NOT NULL DEFAULT 0,
  "errors"       JSONB                 NOT NULL DEFAULT '[]',
  "status"       "SchedulerRunStatus"  NOT NULL DEFAULT 'SUCCESS',

  CONSTRAINT "scheduler_runs_pkey" PRIMARY KEY ("id")
);
