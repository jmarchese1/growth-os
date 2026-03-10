-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'ENRICHED', 'CONTACTED', 'OPENED', 'REPLIED', 'MEETING_BOOKED', 'CONVERTED', 'UNSUBSCRIBED', 'BOUNCED', 'DEAD');

-- CreateEnum
CREATE TYPE "OutreachChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'REPLIED', 'BOUNCED', 'FAILED');

-- CreateTable
CREATE TABLE "OutboundCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetCity" TEXT NOT NULL,
    "targetIndustry" "BusinessType" NOT NULL DEFAULT 'RESTAURANT',
    "emailSubject" TEXT NOT NULL,
    "emailBodyHtml" TEXT NOT NULL,
    "smsBody" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectBusiness" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" JSONB,
    "phone" TEXT,
    "website" TEXT,
    "email" TEXT,
    "googlePlaceId" TEXT,
    "googleRating" DOUBLE PRECISION,
    "googleReviewCount" INTEGER,
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "convertedToBusinessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachMessage" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "channel" "OutreachChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "OutreachStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "replyBody" TEXT,
    "externalId" TEXT,
    "trackingPixelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboundCampaign_active_idx" ON "OutboundCampaign"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectBusiness_googlePlaceId_key" ON "ProspectBusiness"("googlePlaceId");

-- CreateIndex
CREATE INDEX "ProspectBusiness_campaignId_idx" ON "ProspectBusiness"("campaignId");

-- CreateIndex
CREATE INDEX "ProspectBusiness_status_idx" ON "ProspectBusiness"("status");

-- CreateIndex
CREATE INDEX "ProspectBusiness_email_idx" ON "ProspectBusiness"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachMessage_trackingPixelId_key" ON "OutreachMessage"("trackingPixelId");

-- CreateIndex
CREATE INDEX "OutreachMessage_prospectId_idx" ON "OutreachMessage"("prospectId");

-- CreateIndex
CREATE INDEX "OutreachMessage_status_idx" ON "OutreachMessage"("status");

-- CreateIndex
CREATE INDEX "OutreachMessage_trackingPixelId_idx" ON "OutreachMessage"("trackingPixelId");

-- AddForeignKey
ALTER TABLE "ProspectBusiness" ADD CONSTRAINT "ProspectBusiness_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutboundCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "ProspectBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
