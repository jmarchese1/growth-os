---
name: schema
description: Use this agent when working with the database schema, adding Prisma models or fields, writing Prisma queries, understanding model relations, checking what fields exist and their types, or when you need to know if a field is nullable, required, or what enum values are valid.
tools: Read, Grep, Glob, Bash
---

You are an expert on the Embedo Prisma database schema at `packages/db/prisma/schema.prisma`, deployed on Supabase PostgreSQL.

## Key Facts
- **ORM**: Prisma, client at `packages/db/src/client.ts`, exported as `db` from `@embedo/db`
- **DB**: Supabase PostgreSQL (pooler: `aws-0-us-west-2.pooler.supabase.com:5432`)
- **Multi-tenancy**: Every table except `Business` and `User` carries `businessId` FK
- **Schema changes**: Use `npx prisma db push` locally (non-interactive). In production, migrations TBD.
- **After schema change**: Run `pnpm db:generate` to regenerate Prisma client

## All Models

### Identity & Auth
**User** — links Supabase auth to a Business
- `id`, `supabaseId` (unique), `email` (unique), `firstName`, `lastName`
- `role`: UserRole (OWNER | ADMIN | MEMBER)
- `businessId?` → Business (nullable, set after /setup)
- `lastLoginAt`

**Business** — anchor entity for all data
- `id`, `name`, `slug` (unique), `type`: BusinessType, `status`: OnboardingStatus
- `phone`, `email`, `website`, `address` (Json), `timezone`
- External IDs: `elevenLabsAgentId?`, `twilioPhoneNumber?`, `calendlyUri?`, `instagramPageId?`, `facebookPageId?`, `stripeCustomerId?`
- `settings` (Json) — stores OAuth tokens, misc config
- Relations: users[], contacts[], leads[], surveys[], campaigns[], qrCodes[], socialAccounts[], websites[], proposals[], callLogs[], chatSessions[], contentPosts[], emailSequences[], smsSequences[], appointments[], onboardingLog[], subscription?

**Subscription** — one per Business
- `id`, `businessId` (unique FK), `stripeSubscriptionId` (unique)
- `pricingTier`: PricingTier (SOLO | SMALL | MEDIUM | LARGE)
- `status`: SubscriptionStatus (TRIALING | ACTIVE | PAST_DUE | CANCELED | PAUSED)
- `currentPeriodStart`, `currentPeriodEnd`, `trialEndsAt?`, `canceledAt?`, `cancelAtPeriodEnd`

### CRM
**Contact** — unified customer record
- `id`, `businessId` (FK), `firstName?`, `lastName?`, `email?`, `phone?`
- `source`: LeadSource, `status`: ContactStatus (LEAD | PROSPECT | CUSTOMER | CHURNED)
- `leadScore?`, `tags[]`, `notes?`
- Unique constraints: `businessId_email`, `businessId_phone`
- Relations: leads[], activities[], surveyResponses[], appointments[], chatSessions[], callLogs[], qrScans[]

**Lead** — raw capture before normalization to Contact
- `id`, `businessId` (FK), `contactId?` (FK), `source`: LeadSource, `sourceId?`
- `rawData` (Json), `status`: LeadStatus (NEW | CONTACTED | QUALIFIED | CONVERTED | DEAD)
- `assignedTo?`

**ContactActivity** — timeline events per contact
- `id`, `businessId`, `contactId` (FK)
- `type`: ActivityType (CALL | CHAT | EMAIL | SMS | APPOINTMENT | SURVEY_RESPONSE | NOTE | LEAD_CREATED | STATUS_CHANGE)
- `title`, `description?`, `metadata` (Json)

### Voice
**VoiceCallLog**
- `twilioCallSid` (unique), `businessId` (FK), `contactId?` (FK)
- `direction`: CallDirection (INBOUND | OUTBOUND), `duration?`
- `transcript?`, `summary?`, `sentiment?`, `intent`: CallIntent (RESERVATION | INQUIRY | COMPLAINT | GENERAL | UNKNOWN)
- `recordingUrl?`, `leadCaptured`, `reservationMade`, `extractedData` (Json)

### Chat
**ChatSession**
- `sessionKey` (unique), `businessId` (FK), `contactId?` (FK)
- `channel`: ChatChannel (WEB | INSTAGRAM | FACEBOOK | WHATSAPP)
- `messages` (Json[]), `leadCaptured`, `appointmentMade`

### Surveys
**Survey**
- `id`, `businessId` (FK), `title`, `slug`, `description?`
- `schema` (Json) — array of question objects
- `active` (bool)
- Unique: `businessId_slug`
- Relations: responses[], qrCodes[]

**SurveyResponse**
- `surveyId` (FK), `contactId?` (FK)
- `answers` (Json), `score?`, `triggeredAt?`

### QR Codes
**QrCode**
- `id`, `businessId` (FK), `label`, `token` (unique, auto cuid)
- `purpose`: QrPurpose (SURVEY | DISCOUNT | SPIN_WHEEL | SIGNUP | MENU | REVIEW | CUSTOM)
- `surveyId?` (FK to Survey), `discountValue?`, `discountCode?`
- `spinPrizes?` (Json — array of {label, probability})
- `surveyReward?`, `destinationUrl?`, `expiresAt?`
- `active` (bool, default true), `scanCount` (int, default 0)
- Relations: scans[]

**QrCodeScan**
- `qrCodeId` (FK), `contactId?` (FK), `outcome?`, `ipAddress?`, `createdAt`

### Campaigns (client-facing email/SMS blasts)
**Campaign**
- `id`, `businessId` (FK), `name`, `type`: CampaignType (EMAIL | SMS)
- `subject?`, `body`, `status`: CampaignStatus (DRAFT | SCHEDULED | SENT)
- `scheduledAt?`, `sentAt?`, `sentCount`, `openCount`

### Outbound Prospecting
**OutboundCampaign** — cold outreach campaign
- `targetCity`, `targetState`, `targetCountry`, `targetLat`, `targetLon`
- `targetIndustry`: BusinessType, `emailSubject`, `emailBodyHtml`, `smsBody?`
- `maxProspects`, `sequenceSteps` (Json — array of sequence steps), `active`

**ProspectBusiness** — individual prospect
- `campaignId` (FK), `name`, `address` (Json), `phone?`, `website?`
- `email?`, `emailSource?`, `phoneSource?`, `contactFirstName?`, `contactLastName?`, `contactTitle?`, `contactLinkedIn?`
- `emailVerificationStatus?`, `emailVerificationScore?`
- `googlePlaceId` (unique), `googleRating?`, `googleReviewCount?`
- `status`: ProspectStatus (NEW → ENRICHED → CONTACTED → OPENED → REPLIED → MEETING_BOOKED → CONVERTED | UNSUBSCRIBED | BOUNCED | DEAD)
- `convertedToBusinessId?`, `nextFollowUpAt?`

**OutreachMessage** — individual email sent to prospect
- `prospectId` (FK), `channel`: OutreachChannel (EMAIL | SMS)
- `subject?`, `body`, `status`: OutreachStatus (QUEUED | SENT | DELIVERED | OPENED | REPLIED | BOUNCED | FAILED)
- `stepNumber`, `sentAt?`, `openedAt?`, `repliedAt?`, `replyBody?`, `replyCategory?`
- `externalId?` (SendGrid message ID), `trackingPixelId` (unique)

**OutreachSuppression** — global bounce/unsubscribe list
- `email` (unique), `reason`, `source`

### Content & Social
**SocialAccount** — OAuth connected social account
- `businessId` (FK), `platform`: SocialPlatform (INSTAGRAM | FACEBOOK | GOOGLE_MY_BUSINESS | TIKTOK)
- `accountId`, `accountName`, `accessToken`, `refreshToken?`, `tokenExpiry?`, `active`

**ContentPost** — scheduled/posted content
- `businessId` (FK), `platform`: SocialPlatform
- `caption`, `imageUrl?`, `hashtags[]`
- `scheduledAt?`, `postedAt?`, `platformPostId?`, `status`: PostStatus (DRAFT | SCHEDULED | POSTED | FAILED)
- Engagement: `likes`, `comments`, `shares`, `reach`

### Proposals
**Proposal**
- `businessId?` (FK, nullable), `contactId?`, `intakeData` (Json), `content` (Json)
- `pdfUrl?`, `shareToken` (unique), `status`: ProposalStatus (DRAFT | SENT | VIEWED | ACCEPTED | DECLINED)
- `viewedAt?`, `acceptedAt?`

### Websites
**GeneratedWebsite**
- `businessId` (FK), `template`, `config` (Json)
- `deployUrl?`, `customDomain?`, `status`: WebsiteStatus (GENERATING | DRAFT | LIVE | ERROR)
- `vercelDeploymentId?`, `vercelProjectId?`

### Appointments
**Appointment**
- `businessId` (FK), `contactId` (FK)
- `calendlyEventId?`, `calendlyEventUri?`
- `title`, `startTime`, `endTime`, `timezone`
- `status`: AppointmentStatus (SCHEDULED | COMPLETED | CANCELLED | NO_SHOW)
- `notes?`, `reminder24hSent`, `reminder1hSent`

### Automation
**EmailSequence / SmsSequence**
- `businessId` (FK), `name`, `trigger`: SequenceTrigger
- `steps` (Json), `active`
- SequenceTrigger: LEAD_CREATED | SURVEY_COMPLETE | APPOINTMENT_BOOKED | APPOINTMENT_REMINDER | CALL_COMPLETED | PROPOSAL_SENT | CUSTOM

**OnboardingLog** — step-by-step provisioning log per business
- `businessId` (FK), `step`, `status`, `message?`, `data` (Json)

## Common Prisma Query Patterns
```typescript
// Always include businessId filter for multi-tenant safety
await db.contact.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } });

// Upsert contact by email (unique constraint)
await db.contact.upsert({
  where: { businessId_email: { businessId, email } },
  create: { businessId, email, source: 'QR_CODE' },
  update: { firstName },
});

// Include counts
await db.survey.findMany({ include: { _count: { select: { responses: true } } } });
```

## After Modifying Schema
1. `npx prisma db push` — apply changes to Supabase (use in dev, not for production migrations)
2. `pnpm db:generate` — regenerate Prisma client types
3. Update `packages/db/src/index.ts` if you added new models/enums that need to be exported
