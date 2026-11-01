import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isRequestAuthorized } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const estudiantes = await db.getEstudiantes(false);
    return NextResponse.json({ success: true, data: estudiantes });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener lista de estudiantes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { nombre, telefono_whatsapp, activo } = await req.json();

    if (!nombre || nombre.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El nombre del estudiante es obligatorio.' },
        { status: 400 }
      );
    }

    const created = await db.createEstudiante({
      nombre: nombre.trim(),
      telefono_whatsapp: telefono_whatsapp ? telefono_whatsapp.trim() : null,
      activo: activo !== undefined ? (activo ? 1 : 0) : 1,
    });

    return NextResponse.json({
      success: true,
      message: 'Estudiante agregado correctamente',
      data: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear estudiante' },
      { status: 500 }
    );
  }
}
