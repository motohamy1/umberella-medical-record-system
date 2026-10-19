import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Automatically load .env.local if present in runtime
const envLocal = path.join(process.cwd(), '.env.local');
const envDefault = path.join(process.cwd(), '.env');
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
} else if (fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault });
}

export function getDb(): NeonQueryFunction<false, false> | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

// Local store fallback for fast development and unit testing
const dataDir = path.join(process.cwd(), '.data');
const storeFilePath = path.join(dataDir, 'store.json');

export function readStore(): any {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(storeFilePath)) {
      return {
        patients: [],
        careEvents: [],
        vitals: [],
        appointments: [],
        visits: [],
        medications: [],
        labs: [],
        imaging: [],
      };
    }
    const raw = fs.readFileSync(storeFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading local store:', err);
    return {
      patients: [],
      careEvents: [],
      vitals: [],
      appointments: [],
      visits: [],
      medications: [],
      labs: [],
      imaging: [],
    };
  }
}

export function writeStore(data: any): void {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(storeFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed writing local store:', err);
  }
}
