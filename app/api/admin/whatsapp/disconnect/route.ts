import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '@/lib/auth';
import { disconnectBaileys, initBaileys } from '@/lib/whatsapp-baileys';

export async function POST(req: NextRequest) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  await disconnectBaileys();
  // Reiniciar para generar un nuevo QR
  setTimeout(() => {
    initBaileys().catch((e) => console.error('Error al reiniciar Baileys:', e));
  }, 1000);

  return NextResponse.json({
    success: true,
    message: 'Sesión de WhatsApp cerrada. Se generará un nuevo código QR.',
  });
}
