-- AlterEnum
ALTER TYPE "LeadSource" ADD VALUE 'OUTBOUND';

-- CreateTable
CREATE TABLE "OutreachSuppression" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachSuppression_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "OutboundCampaign" ADD COLUMN     "sequenceSteps" JSONB,
ADD COLUMN     "targetCountry" TEXT,
ADD COLUMN     "targetLat" DOUBLE PRECISION,
ADD COLUMN     "targetLon" DOUBLE PRECISION,
ADD COLUMN     "targetState" TEXT;

-- AlterTable
ALTER TABLE "OutreachMessage" ADD COLUMN     "replyCategory" TEXT,
ADD COLUMN     "stepNumber" INTEGER;

-- AlterTable
ALTER TABLE "ProspectBusiness" ADD COLUMN     "contactFirstName" TEXT,
ADD COLUMN     "contactLastName" TEXT,
ADD COLUMN     "contactLinkedIn" TEXT,
ADD COLUMN     "contactTitle" TEXT,
ADD COLUMN     "emailVerificationScore" DOUBLE PRECISION,
ADD COLUMN     "emailVerificationStatus" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "OutreachSuppression_email_idx" ON "OutreachSuppression"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachSuppression_email_key" ON "OutreachSuppression"("email");

-- CreateIndex
CREATE INDEX "ProspectBusiness_nextFollowUpAt_idx" ON "ProspectBusiness"("nextFollowUpAt");
