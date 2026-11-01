import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isRequestAuthorized } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);
    if (isNaN(studentId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const unlock = body.unlock !== undefined ? !!body.unlock : true;

    await db.unlockEstudiante(studentId, unlock);

    return NextResponse.json({
      success: true,
      message: unlock
        ? 'Estudiante desbloqueado: ya puede recibir una nueva entrega de inmediato.'
        : 'Bloqueo semanal reestablecido.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al desbloquear estudiante' },
      { status: 500 }
    );
  }
}
