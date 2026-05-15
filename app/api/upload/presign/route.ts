/**
 * /api/upload/presign -- DISABLED
 * R2 file uploads have been removed. Researchers should include links
 * to evidence (Google Drive, GitHub Gists, etc.) in the evidence field.
 */
import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json(
    { error: 'File uploads are no longer supported. Please include evidence links in your report.' },
    { status: 410 },
  );
}

export function POST() {
  return NextResponse.json(
    { error: 'File uploads are no longer supported. Please include evidence links in your report.' },
    { status: 410 },
  );
}
