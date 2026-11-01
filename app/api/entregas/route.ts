import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendWhatsAppNotification, buildAnonymousGiftMessage } from '@/lib/whatsapp';

function generateRandomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  let result = 'SF-';
  for (let i = 0; i < 2; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  for (let i = 0; i < 4; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { estudiante_id, mensaje_anonimo } = body;
    let { codigo_secreto } = body;

    if (!estudiante_id) {
      return NextResponse.json(
        { success: false, error: 'Debes seleccionar a un compañero de la lista.' },
        { status: 400 }
      );
    }

    // 1. Verificar que el estudiante existe y está activo
    const estudiante = await db.getEstudianteById(Number(estudiante_id));
    if (!estudiante || !estudiante.activo) {
      return NextResponse.json(
        { success: false, error: 'El estudiante seleccionado no se encuentra disponible.' },
        { status: 404 }
      );
    }

    // 2. REGLA ESTRICTA: Solo 1 entrega por semana (se restablece los lunes o por desbloqueo del admin)
    const weeklyCheck = await db.checkWeeklyLimit(estudiante.id);
    if (!weeklyCheck.allowed) {
      const tiempoMsg =
        weeklyCheck.daysRemaining && weeklyCheck.daysRemaining > 0
          ? `${weeklyCheck.daysRemaining} días (el próximo lunes)`
          : `${weeklyCheck.hoursRemaining || 1} horas`;

      return NextResponse.json(
        {
          success: false,
          error: `⛔ ¡Límite alcanzado! ${estudiante.nombre} ya recibió una entrega esta semana. Las notificaciones se restablecen automáticamente los lunes (o si el administrador las desbloquea en /admin). Tiempo restante: ${tiempoMsg}.`,
        },
        { status: 429 }
      );
    }

    // 3. Generar código secreto único
    if (!codigo_secreto || typeof codigo_secreto !== 'string' || codigo_secreto.trim().length === 0) {
      codigo_secreto = generateRandomCode();
    } else {
      codigo_secreto = codigo_secreto.trim().toUpperCase().substring(0, 10);
    }

    // 4. Insertar la entrega en la base de datos
    let entrega;
    try {
      entrega = await db.createEntrega({
        estudiante_id: estudiante.id,
        codigo_secreto,
        mensaje_anonimo: mensaje_anonimo ? String(mensaje_anonimo).trim() : null,
      });
    } catch (dbErr: any) {
      if (dbErr.code === 'ER_DUP_ENTRY' || dbErr.message?.includes('duplicate key')) {
        codigo_secreto = generateRandomCode();
        entrega = await db.createEntrega({
          estudiante_id: estudiante.id,
          codigo_secreto,
          mensaje_anonimo: mensaje_anonimo ? String(mensaje_anonimo).trim() : null,
        });
      } else {
        throw dbErr;
      }
    }

    // 5. Enviar mensaje DIRECTO e INSTANTÁNEO de WhatsApp al celular del destinatario
    let whatsappResult = null;

    if (estudiante.telefono_whatsapp) {
      whatsappResult = await sendWhatsAppNotification({
        nombreEstudiante: estudiante.nombre,
        telefonoDestino: estudiante.telefono_whatsapp,
        codigoSecreto: entrega.codigo_secreto,
        mensajeAnonimo: entrega.mensaje_anonimo,
      });
    } else {
      whatsappResult = {
        success: false,
        provider: 'none',
        error: 'El estudiante no tiene número registrado. El administrador puede completarlo en /admin.',
      };
    }

    return NextResponse.json({
      success: true,
      message: '¡Entrega registrada y notificada con éxito!',
      entrega: {
        id: entrega.id,
        codigo_secreto: entrega.codigo_secreto,
        fecha_entrega: entrega.fecha_entrega,
        mensaje_anonimo: entrega.mensaje_anonimo,
        destinatario: estudiante.nombre,
      },
      whatsapp: whatsappResult,
    });
  } catch (error: any) {
    console.error('Error al registrar entrega:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno al registrar la entrega de regalo.',
      },
      { status: 500 }
    );
  }
}
