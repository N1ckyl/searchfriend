import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codigo = searchParams.get('codigo');

    if (!codigo || codigo.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Por favor ingresa un código de reclamo.' },
        { status: 400 }
      );
    }

    const entrega = await db.getEntregaByCodigo(codigo);

    if (!entrega) {
      return NextResponse.json(
        { success: false, error: 'No se encontró ninguna entrega con este código secreto.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: entrega.id,
        codigo_secreto: entrega.codigo_secreto,
        destinatario: entrega.estudiante_nombre,
        mensaje_anonimo: entrega.mensaje_anonimo,
        fecha_entrega: entrega.fecha_entrega,
      },
    });
  } catch (error: any) {
    console.error('Error al buscar entrega:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al buscar el código.' },
      { status: 500 }
    );
  }
}
