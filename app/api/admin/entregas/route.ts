import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isRequestAuthorized } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const entregas = await db.getEntregas();
    return NextResponse.json({ success: true, data: entregas });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener entregas' },
      { status: 500 }
    );
  }
}
