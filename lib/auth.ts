import { NextRequest } from 'next/server';
import crypto from 'crypto';

const ADMIN_PIN = process.env.ADMIN_PIN;
if (!ADMIN_PIN) throw new Error('ADMIN_PIN is not set in environment variables.');
const AUTH_SECRET = process.env.AUTH_SECRET || 'searchfriend-secret-salt-2026';

export function verifyAdminPin(pin: string): boolean {
  if (!pin) return false;
  return pin.trim() === ADMIN_PIN.trim();
}

export function generateAdminToken(): string {
  const payload = `admin:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64');
}

export function verifyAdminToken(token?: string | null): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;
    const [role, timestampStr, hmac] = parts;
    if (role !== 'admin') return false;

    // Token expira después de 24 horas
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    if (isNaN(timestamp) || now - timestamp > 24 * 60 * 60 * 1000) {
      return false;
    }

    const expectedHmac = crypto.createHmac('sha256', AUTH_SECRET).update(`admin:${timestampStr}`).digest('hex');
    return hmac === expectedHmac;
  } catch {
    return false;
  }
}

export function isRequestAuthorized(req: NextRequest): boolean {
  // 1. Revisar cookie 'sf_admin_token'
  const cookieToken = req.cookies.get('sf_admin_token')?.value;
  if (cookieToken && verifyAdminToken(cookieToken)) {
    return true;
  }

  // 2. Revisar header Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.substring(7);
    if (verifyAdminToken(headerToken)) return true;
  }

  // 3. Revisar header directo 'x-admin-pin'
  const pinHeader = req.headers.get('x-admin-pin');
  if (pinHeader && verifyAdminPin(pinHeader)) {
    return true;
  }

  return false;
}
