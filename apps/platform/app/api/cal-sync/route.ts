import { NextResponse } from 'next/server';

const API_URL = process.env['API_GATEWAY_URL'] ?? process.env['API_URL'] ?? 'http://localhost:3000';

export async function POST() {
  try {
    const res = await fetch(`${API_URL}/appointments/sync-cal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
