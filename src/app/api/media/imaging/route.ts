import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { verifySignedMediaToken } from '@/lib/signedAccess';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawPath = searchParams.get('path');
  const expStr = searchParams.get('exp');
  const sig = searchParams.get('sig');

  if (!rawPath || !expStr || !sig) {
    return NextResponse.json(
      { error: 'Forbidden: Missing signed access parameters' },
      { status: 403 }
    );
  }

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || !verifySignedMediaToken(rawPath, exp, sig)) {
    return NextResponse.json(
      { error: 'Forbidden: Invalid or expired signed access token' },
      { status: 403 }
    );
  }

  // Prevent directory traversal
  const sanitizedPath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
  let fullPath = path.join(process.cwd(), 'public', sanitizedPath);

  if (!fs.existsSync(fullPath)) {
    // Fallback to demo scan if specific image is not on disk
    fullPath = path.join(process.cwd(), 'public', 'mri-scan.jpg');
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    console.error('Failed reading signed media:', err);
    return NextResponse.json({ error: 'Failed to retrieve media' }, { status: 500 });
  }
}
