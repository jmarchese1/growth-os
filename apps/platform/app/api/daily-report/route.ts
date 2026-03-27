import { NextResponse } from 'next/server';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

// In-memory cache: one report per day
let cachedReport: { data: unknown; date: string } | null = null;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET() {
  const today = todayKey();

  // Return cached report if it's from today
  if (cachedReport && cachedReport.date === today) {
    return NextResponse.json(cachedReport.data);
  }

  // Otherwise fetch a fresh one
  try {
    const res = await fetch(`${PROSPECTOR_URL}/daily-report`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json(null, { status: res.status });
    const data = await res.json();

    // Cache it for the rest of the day
    cachedReport = { data, date: today };

    return NextResponse.json(data);
  } catch {
    // If fetch fails but we have a stale cache, return it
    if (cachedReport) return NextResponse.json(cachedReport.data);
    return NextResponse.json(null);
  }
}
