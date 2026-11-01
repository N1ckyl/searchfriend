import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '@/lib/auth';
import { initBaileys, getBaileysStatus } from '@/lib/whatsapp-baileys';

export async function GET(req: NextRequest) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  // Si no está inicializado, disparar inicio en segundo plano
  const current = getBaileysStatus();
  if (current.status === 'DISCONNECTED') {
    initBaileys().catch((e) => console.error('Error auto-iniciando Baileys:', e));
  }

  const status = getBaileysStatus();
  return NextResponse.json({
    success: true,
    data: status,
  });
}
