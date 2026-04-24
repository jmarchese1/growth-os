/**
 * Google Sheets integration — the human-facing data surface.
 *
 * Each Agent has one spreadsheet with 4 tabs:
 *   1. Prospects       — one row per business discovered
 *   2. Emails Sent     — one row per email send attempt
 *   3. Daily Summary   — aggregate rows per day
 *   4. Agent Log       — run events (audit trail)
 *
 * Auth: a Google service account JSON passed via GOOGLE_SERVICE_ACCOUNT_KEY
 * (stringified JSON in the env). The sheet must be shared with the service
 * account's email address as an Editor.
 */

import { google, type sheets_v4 } from 'googleapis';
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';

const log = createLogger('agent:sheets');

const TABS = {
  PROSPECTS: 'Prospects',
  EMAILS: 'Emails Sent',
  DAILY: 'Daily Summary',
  LOG: 'Agent Log',
} as const;

const TAB_HEADERS: Record<string, string[]> = {
  [TABS.PROSPECTS]: [
    'Timestamp', 'Agent', 'Campaign', 'City', 'Industry',
    'Business Name', 'Email', 'Phone', 'Website',
    'Contact First', 'Contact Last', 'Contact Title',
    'Google Rating', 'Status', 'Notes',
  ],
  [TABS.EMAILS]: [
    'Timestamp', 'Agent', 'Campaign',
    'Business Name', 'To', 'Subject', 'From Domain',
    'Step', 'Status', 'Opened At', 'Replied At', 'Reply Category', 'Reply Body',
  ],
  [TABS.DAILY]: [
    'Date', 'Agent',
    'Prospects Added', 'Emails Sent', 'Opens', 'Replies',
    'Meetings Booked', 'Bounces', 'Campaigns Spawned',
  ],
  [TABS.LOG]: [
    'Timestamp', 'Agent', 'Run ID', 'Level', 'Message',
    'Campaign', 'Prospect',
  ],
};

// ── Auth ────────────────────────────────────────────────────────────

let cachedClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets | null {
  if (cachedClient) return cachedClient;

  const raw = process.env['GOOGLE_SERVICE_ACCOUNT_KEY'];
  if (!raw) {
    log.warn('GOOGLE_SERVICE_ACCOUNT_KEY not set — Sheets integration disabled');
    return null;
  }

  try {
    const credentials = JSON.parse(raw);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });
    cachedClient = google.sheets({ version: 'v4', auth });
    return cachedClient;
  } catch (err) {
    log.error({ err }, 'Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY');
    return null;
  }
}

function getDriveClient() {
  const raw = process.env['GOOGLE_SERVICE_ACCOUNT_KEY'];
  if (!raw) return null;
  try {
    const credentials = JSON.parse(raw);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
  } catch {
    return null;
  }
}

// ── Spreadsheet provisioning ───────────────────────────────────────

/**
 * Create a new spreadsheet for an agent. Returns the spreadsheet ID + URL.
 * Sets up the 4 tabs with headers. Shares with the owner email if provided.
 */
export async function provisionAgentSheet(agentName: string, shareWithEmail?: string): Promise<{
  sheetId: string;
  url: string;
} | null> {
  const sheets = getSheetsClient();
  if (!sheets) return null;

  const title = `Embedo · ${agentName}`;

  try {
    // Create the spreadsheet
    const create = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: Object.values(TABS).map((name) => ({
          properties: { title: name, gridProperties: { frozenRowCount: 1 } },
        })),
      },
    });

    const sheetId = create.data.spreadsheetId!;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}`;

    // Write headers to each tab
    const valueRanges = Object.entries(TAB_HEADERS).map(([tabName, headers]) => ({
      range: `${tabName}!A1`,
      values: [headers],
    }));
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: 'RAW', data: valueRanges },
    });

    // Format the header rows — bold, colored background
    const sheetMetadata = create.data.sheets!;
    const requests = sheetMetadata.map((s) => ({
      repeatCell: {
        range: { sheetId: s.properties!.sheetId!, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.05, green: 0.05, blue: 0.05 },
            textFormat: {
              foregroundColor: { red: 0.84, green: 0.97, blue: 0.3 }, // signal green
              bold: true,
              fontFamily: 'Roboto Mono',
              fontSize: 9,
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests },
    });

    // Share with the user email if provided
    if (shareWithEmail) {
      const drive = getDriveClient();
      if (drive) {
        try {
          await drive.permissions.create({
            fileId: sheetId,
            requestBody: { role: 'writer', type: 'user', emailAddress: shareWithEmail },
            sendNotificationEmail: false,
          });
        } catch (err) {
          log.warn({ err, shareWithEmail }, 'Could not share sheet (continuing)');
        }
      }
    }

    log.info({ sheetId, url }, 'Provisioned new agent sheet');
    return { sheetId, url };
  } catch (err) {
    log.error({ err }, 'Failed to provision sheet');
    return null;
  }
}

// ── Row writers ─────────────────────────────────────────────────────

async function appendRow(sheetId: string, tab: string, row: (string | number | null | undefined)[]): Promise<void> {
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tab}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row.map((v) => v ?? '')],
      },
    });
  } catch (err) {
    log.warn({ err, tab }, 'Sheet append failed');
  }
}

async function appendRows(sheetId: string, tab: string, rows: (string | number | null | undefined)[][]): Promise<void> {
  if (rows.length === 0) return;
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tab}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows.map((row) => row.map((v) => v ?? '')),
      },
    });
  } catch (err) {
    log.warn({ err, tab, rowCount: rows.length }, 'Sheet batch append failed');
  }
}

// ── Public write APIs ──────────────────────────────────────────────

export interface ProspectRowInput {
  agentName: string;
  campaignName: string;
  city: string;
  industry: string;
  businessName: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactTitle?: string | null;
  googleRating?: number | null;
  status: string;
  notes?: string;
}

export async function writeProspectRow(agentId: string, input: ProspectRowInput): Promise<void> {
  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent?.googleSheetId) return;

  const row: (string | number | null | undefined)[] = [
    new Date().toISOString(),
    input.agentName,
    input.campaignName,
    input.city,
    input.industry,
    input.businessName,
    input.email,
    input.phone,
    input.website,
    input.contactFirstName,
    input.contactLastName,
    input.contactTitle,
    input.googleRating,
    input.status,
    input.notes,
  ];

  await appendRow(agent.googleSheetId, TABS.PROSPECTS, row);
}

export async function writeProspectRows(agentId: string, inputs: ProspectRowInput[]): Promise<void> {
  if (inputs.length === 0) return;
  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent?.googleSheetId) return;

  const ts = new Date().toISOString();
  const rows: (string | number | null | undefined)[][] = inputs.map((input) => [
    ts,
    input.agentName,
    input.campaignName,
    input.city,
    input.industry,
    input.businessName,
    input.email,
    input.phone,
    input.website,
    input.contactFirstName,
    input.contactLastName,
    input.contactTitle,
    input.googleRating,
    input.status,
    input.notes,
  ]);

  await appendRows(agent.googleSheetId, TABS.PROSPECTS, rows);
}

export interface EmailRowInput {
  agentName: string;
  campaignName: string;
  businessName: string;
  toEmail: string;
  subject: string;
  fromDomain: string;
  stepNumber: number;
  status: string;
}

export async function writeEmailRow(agentId: string, input: EmailRowInput): Promise<void> {
  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent?.googleSheetId) return;

  const row = [
    new Date().toISOString(),
    input.agentName,
    input.campaignName,
    input.businessName,
    input.toEmail,
    input.subject,
    input.fromDomain,
    input.stepNumber,
    input.status,
    '', // Opened At — filled by webhook later
    '', // Replied At
    '',
    '',
  ];

  await appendRow(agent.googleSheetId, TABS.EMAILS, row);
}

export async function writeLogRow(
  agentId: string,
  input: {
    agentName: string;
    runId: string;
    level: string;
    message: string;
    campaignName?: string;
    prospectName?: string;
  }
): Promise<void> {
  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent?.googleSheetId) return;

  await appendRow(agent.googleSheetId, TABS.LOG, [
    new Date().toISOString(),
    input.agentName,
    input.runId,
    input.level,
    input.message,
    input.campaignName ?? '',
    input.prospectName ?? '',
  ]);
}

export async function writeDailySummary(
  agentId: string,
  stats: {
    agentName: string;
    prospectsAdded: number;
    emailsSent: number;
    opens: number;
    replies: number;
    meetingsBooked: number;
    bounces: number;
    campaignsSpawned: number;
  }
): Promise<void> {
  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent?.googleSheetId) return;

  await appendRow(agent.googleSheetId, TABS.DAILY, [
    new Date().toISOString().slice(0, 10),
    stats.agentName,
    stats.prospectsAdded,
    stats.emailsSent,
    stats.opens,
    stats.replies,
    stats.meetingsBooked,
    stats.bounces,
    stats.campaignsSpawned,
  ]);
}
