import { NextResponse } from 'next/server';

const PROPOSAL_API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3008';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params;

  try {
    const res = await fetch(`${PROPOSAL_API}/proposals/${shareToken}`, {
      headers: { Accept: 'text/html' },
    });

    if (!res.ok) {
      return new NextResponse('Proposal not found', { status: 404 });
    }

    const html = await res.text();
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new NextResponse('Unable to load proposal', { status: 502 });
  }
}
