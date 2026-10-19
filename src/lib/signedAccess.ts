import crypto from 'node:crypto';

/**
 * Short-lived signed access tokens for clinical imaging media.
 * Enforces secure signed access so raw files are never publicly browsable without authorization.
 */

const SIGNING_SECRET = process.env.SIGNED_MEDIA_SECRET || 'umbrella-clinical-imaging-secret-key-2026';

export interface SignedMediaInfo {
  signedUrl: string;
  expiresAt: number;
  token: string;
}

export function generateSignedMediaUrl(imagePath: string, expiresInSeconds: number = 300): string {
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  const exp = Date.now() + expiresInSeconds * 1000;
  const dataToSign = `${cleanPath}:${exp}`;
  const sig = crypto.createHmac('sha256', SIGNING_SECRET).update(dataToSign).digest('hex').slice(0, 16);
  
  return `/api/media/imaging?path=${encodeURIComponent(cleanPath)}&exp=${exp}&sig=${sig}`;
}

export function verifySignedMediaToken(cleanPath: string, exp: number, sig: string): boolean {
  if (Date.now() > exp) {
    return false; // Expired
  }
  const dataToSign = `${cleanPath}:${exp}`;
  const expectedSig = crypto.createHmac('sha256', SIGNING_SECRET).update(dataToSign).digest('hex').slice(0, 16);
  return sig === expectedSig;
}
