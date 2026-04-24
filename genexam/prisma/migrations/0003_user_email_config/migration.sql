-- Per-user SMTP settings stored in the DB, encrypted with ENCRYPTION_KEY.
-- One config row per user; if the row is absent the email feature falls back
-- to SMTP_* env vars.

CREATE TABLE "UserEmailConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "encryptedPassword" TEXT,
    "fromAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserEmailConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserEmailConfig_userId_key" ON "UserEmailConfig"("userId");

ALTER TABLE "UserEmailConfig"
    ADD CONSTRAINT "UserEmailConfig_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
