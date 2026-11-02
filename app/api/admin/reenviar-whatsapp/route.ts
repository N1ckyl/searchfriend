import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isRequestAuthorized } from '@/lib/auth';
import { sendWhatsAppNotification, generateDirectWhatsAppLink, buildAnonymousGiftMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { codigo_secreto, test_phone, test_message } = await req.json();

    if (test_phone) {
      const result = await sendWhatsAppNotification({
        nombreEstudiante: 'Prueba',
        telefonoDestino: test_phone,
        codigoSecreto: 'TEST-0001',
        mensajeAnonimo: test_message || 'Mensaje de prueba',
      });
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Error enviando prueba', whatsapp: result },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, whatsapp: result });
    }

    if (!codigo_secreto) {
      return NextResponse.json(
        { success: false, error: 'El código secreto de la entrega es requerido.' },
        { status: 400 }
      );
    }

    const entrega = await db.getEntregaByCodigo(codigo_secreto);

    if (!entrega) {
      return NextResponse.json(
        { success: false, error: 'Entrega no encontrada' },
        { status: 404 }
      );
    }

    const estudiante = await db.getEstudianteById(entrega.estudiante_id);
    if (!estudiante || !estudiante.telefono_whatsapp) {
      return NextResponse.json(
        {
          success: false,
          error: `El estudiante ${entrega.estudiante_nombre || ''} no tiene teléfono registrado. Edita sus datos primero.`,
        },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppNotification({
      nombreEstudiante: estudiante.nombre,
      telefonoDestino: estudiante.telefono_whatsapp,
      codigoSecreto: entrega.codigo_secreto,
      mensajeAnonimo: entrega.mensaje_anonimo,
    });

    const msgText = buildAnonymousGiftMessage({
      nombreEstudiante: estudiante.nombre,
      codigoSecreto: entrega.codigo_secreto,
      mensajeAnonimo: entrega.mensaje_anonimo,
    });

    const waLink = generateDirectWhatsAppLink(estudiante.telefono_whatsapp, msgText);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'No se pudo enviar la alerta por WhatsApp',
          whatsapp: result,
          directLink: waLink,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      whatsapp: result,
      directLink: waLink,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al reenviar mensaje' },
      { status: 500 }
    );
  }
}
