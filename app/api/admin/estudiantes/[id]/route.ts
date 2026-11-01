import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isRequestAuthorized } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);
    if (isNaN(studentId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json();
    const updateData: { nombre?: string; telefono_whatsapp?: string | null; activo?: number } = {};

    if (body.nombre !== undefined) updateData.nombre = body.nombre.trim();
    if (body.telefono_whatsapp !== undefined) {
      updateData.telefono_whatsapp = body.telefono_whatsapp ? body.telefono_whatsapp.trim() : null;
    }
    if (body.activo !== undefined) updateData.activo = body.activo ? 1 : 0;

    const updated = await db.updateEstudiante(studentId, updateData);

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Estudiante no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Estudiante actualizado exitosamente',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar estudiante' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);
    if (isNaN(studentId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const success = await db.deleteEstudiante(studentId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'No se pudo eliminar el estudiante' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Estudiante eliminado exitosamente',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar estudiante' },
      { status: 500 }
    );
  }
}
