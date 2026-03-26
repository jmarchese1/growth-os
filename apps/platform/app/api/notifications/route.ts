import { NextResponse } from 'next/server';

const PROSPECTOR_URL = process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

export async function GET() {
  try {
    const res = await fetch(`${PROSPECTOR_URL}/notifications`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json([], { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
