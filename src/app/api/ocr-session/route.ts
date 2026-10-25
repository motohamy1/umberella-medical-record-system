import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const SESSIONS_FILE = path.join(DATA_DIR, 'ocr_sessions.json');

function readSessions(): Record<string, { ready: boolean; imageDataUri?: string; fileName?: string; updatedAt: number }> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading ocr sessions:', err);
  }
  return {};
}

function writeSessions(sessions: Record<string, { ready: boolean; imageDataUri?: string; fileName?: string; updatedAt: number }>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing ocr sessions:', err);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session parameter' }, { status: 400 });
  }

  const sessions = readSessions();
  const session = sessions[sessionId];

  if (!session || !session.ready) {
    return NextResponse.json({ ready: false });
  }

  return NextResponse.json({
    ready: true,
    imageDataUri: session.imageDataUri,
    fileName: session.fileName,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, imageDataUri, fileName } = body;

    if (!sessionId || !imageDataUri) {
      return NextResponse.json({ error: 'Missing sessionId or imageDataUri' }, { status: 400 });
    }

    const sessions = readSessions();
    sessions[sessionId] = {
      ready: true,
      imageDataUri,
      fileName: fileName || 'mobile_prescription_capture.jpg',
      updatedAt: Date.now(),
    };

    // Clean up sessions older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const key of Object.keys(sessions)) {
      if (sessions[key].updatedAt < oneHourAgo) {
        delete sessions[key];
      }
    }

    writeSessions(sessions);

    return NextResponse.json({ success: true, sessionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
