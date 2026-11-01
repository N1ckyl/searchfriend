import { NextResponse } from 'next/server';
import { db, getDbProvider } from '@/lib/db';
import { getBaileysStatus } from '@/lib/whatsapp-baileys';

export async function GET() {
  try {
    const provider = getDbProvider();
    const isConnected = await db.testConnection();
    const baileysInfo = getBaileysStatus();

    let studentsCount = 0;
    let missingPhonesCount = 0;
    let deliveriesCount = 0;

    if (isConnected) {
      const students = await db.getEstudiantes(false);
      studentsCount = students.length;
      missingPhonesCount = students.filter(
        (s) => !s.telefono_whatsapp || s.telefono_whatsapp.trim() === ''
      ).length;

      const deliveries = await db.getEntregas();
      deliveriesCount = deliveries.length;
    }

    return NextResponse.json({
      success: true,
      data: {
        dbProvider: provider,
        dbConnected: isConnected,
        whatsappProvider: process.env.WHATSAPP_PROVIDER || 'baileys',
        whatsappBotNumber: baileysInfo.connectedPhone || process.env.WHATSAPP_BOT_NUMBER || 'not-configured',
        baileysStatus: baileysInfo.status,
        studentsCount,
        missingPhonesCount,
        deliveriesCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener estado del sistema',
      },
      { status: 500 }
    );
  }
}
