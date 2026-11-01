import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EstudiantePublico } from '@/lib/types';

export async function GET() {
  try {
    const estudiantes = await db.getEstudiantes(true);

    // Para la vista pública de alumnos:
    // Verificamos si cada alumno ya recibió un regalo en los últimos 7 días
    // y nunca exponemos sus números personales al cliente
    const sanitized: EstudiantePublico[] = await Promise.all(
      estudiantes.map(async (e) => {
        const weeklyCheck = await db.checkWeeklyLimit(e.id);
        return {
          id: e.id,
          nombre: e.nombre,
          tiene_telefono: !!(e.telefono_whatsapp && e.telefono_whatsapp.trim().length > 0),
          puede_recibir_hoy: weeklyCheck.allowed,
          desbloqueado_admin: !!weeklyCheck.unlockedByAdmin,
          dias_restantes: weeklyCheck.daysRemaining,
          horas_restantes: weeklyCheck.hoursRemaining,
          ultima_entrega: weeklyCheck.lastDate?.toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: sanitized,
    });
  } catch (error: any) {
    console.error('Error al obtener estudiantes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al conectar con la base de datos',
      },
      { status: 500 }
    );
  }
}
