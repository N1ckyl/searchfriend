import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isRequestAuthorized } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    await db.unlockAllEstudiantes();

    return NextResponse.json({
      success: true,
      message: 'Todos los estudiantes han sido desbloqueados para recibir entregas esta semana.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al desbloquear todos los estudiantes' },
      { status: 500 }
    );
  }
}
