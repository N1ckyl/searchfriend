import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '@/lib/auth';
import { getWhatsAppLogs } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  const logs = getWhatsAppLogs();
  return NextResponse.json({ success: true, logs });
}
