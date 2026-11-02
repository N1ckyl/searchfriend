import { WhatsAppResult } from './types';
import { sendBaileysMessage, getBaileysStatus } from './whatsapp-baileys';

interface WhatsAppLogEntry {
  id: string;
  timestamp: string;
  to: string;
  studentName: string;
  secretCode: string;
  messageText: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  provider: string;
  error?: string;
}

const memoryLogs: WhatsAppLogEntry[] = [];

export function getWhatsAppLogs(): WhatsAppLogEntry[] {
  return [...memoryLogs].reverse().slice(0, 50);
}

/**
 * Limpia y normaliza el número telefónico para WhatsApp.
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 9) {
      cleaned = '+51' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

/**
 * Genera el mensaje limpio y directo que solicitó el usuario:
 * Directo a la persona con el mensaje que se escribió y su código,
 * sin texto robótico ni caracteres extraños.
 */
export function buildAnonymousGiftMessage(params: {
  nombreEstudiante: string;
  codigoSecreto: string;
  mensajeAnonimo?: string | null;
}): string {
  const { nombreEstudiante, codigoSecreto, mensajeAnonimo } = params;

  if (mensajeAnonimo && mensajeAnonimo.trim().length > 0) {
    return (
      `🎁 ¡Hola ${nombreEstudiante}! Tu Amigo Secreto te ha dejado un regalo:\n\n` +
      `"${mensajeAnonimo.trim()}"\n\n` +
      `🔑 Código de entrega: ${codigoSecreto}`
    );
  }

  return (
    `🎁 ¡Hola ${nombreEstudiante}! Tu Amigo Secreto te ha dejado un regalo listo para ser recogido.\n\n` +
    `🔑 Código de entrega: ${codigoSecreto}`
  );
}

/**
 * Envía la notificación centralizada de WhatsApp directamente al celular.
 */
export async function sendWhatsAppNotification(params: {
  nombreEstudiante: string;
  telefonoDestino: string | null;
  codigoSecreto: string;
  mensajeAnonimo?: string | null;
}): Promise<WhatsAppResult> {
  const { nombreEstudiante, telefonoDestino, codigoSecreto, mensajeAnonimo } = params;

  if (!telefonoDestino || telefonoDestino.trim() === '') {
    return {
      success: false,
      provider: 'none',
      error: 'El estudiante no tiene registrado un número de WhatsApp.',
    };
  }

  const cleanPhone = formatPhoneNumber(telefonoDestino);
  const messageText = buildAnonymousGiftMessage({
    nombreEstudiante,
    codigoSecreto,
    mensajeAnonimo,
  });

  const defaultProvider = process.env.VERCEL ? 'mock' : 'baileys';
  const provider = (process.env.WHATSAPP_PROVIDER || defaultProvider).toLowerCase();

  // 1. Enviar mediante el Bot Autónomo de Baileys (WhatsApp Web Multi-Dispositivo)
  // Si provider es baileys o si el bot ya está conectado:
  const baileysStatus = getBaileysStatus();
  if (provider === 'baileys' || baileysStatus.status === 'CONNECTED') {
    if (baileysStatus.status === 'CONNECTED') {
      const baileysRes = await sendBaileysMessage(cleanPhone, messageText);
      if (baileysRes.success) {
        memoryLogs.push({
          id: baileysRes.messageId || `baileys_${Date.now()}`,
          timestamp: new Date().toISOString(),
          to: cleanPhone,
          studentName: nombreEstudiante,
          secretCode: codigoSecreto,
          messageText,
          status: 'SENT',
          provider: 'baileys',
        });

        console.log(`\n✅ [WhatsApp Bot] Mensaje entregado al instante a ${nombreEstudiante} (${cleanPhone})`);

        return {
          success: true,
          provider: 'baileys',
          messageId: baileysRes.messageId,
          recipientPhone: cleanPhone,
          recipientName: nombreEstudiante,
          previewText: messageText,
        };
      } else {
        memoryLogs.push({
          id: `fail_${Date.now()}`,
          timestamp: new Date().toISOString(),
          to: cleanPhone,
          studentName: nombreEstudiante,
          secretCode: codigoSecreto,
          messageText,
          status: 'FAILED',
          provider: 'baileys',
          error: baileysRes.error,
        });

        return {
          success: false,
          provider: 'baileys',
          error: baileysRes.error || 'Error al enviar por Baileys',
        };
      }
    } else {
      // El bot de Baileys no ha sido escaneado aún
      const errorMsg =
        'El Bot de WhatsApp aún no ha sido vinculado. Ingresa al Panel Admin (/admin) y escanea el código QR con tu WhatsApp para activar el envío automático.';
      console.warn(`[WhatsApp Bot Advertencia] ${errorMsg}`);
      
      memoryLogs.push({
        id: `pending_qr_${Date.now()}`,
        timestamp: new Date().toISOString(),
        to: cleanPhone,
        studentName: nombreEstudiante,
        secretCode: codigoSecreto,
        messageText,
        status: 'FAILED',
        provider: 'baileys',
        error: errorMsg,
      });

      return {
        success: false,
        provider: 'baileys',
        error: errorMsg,
      };
    }
  }

  // 2. WhatsApp Cloud API (Meta Graph API)
  if (provider === 'cloud_api') {
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneId = process.env.WHATSAPP_CLOUD_API_PHONE_ID;

    if (!token || !phoneId) {
      return {
        success: false,
        provider: 'cloud_api',
        error: 'Faltan credenciales WHATSAPP_CLOUD_API_TOKEN o WHATSAPP_CLOUD_API_PHONE_ID.',
      };
    }

    try {
      const recipientDigits = cleanPhone.replace('+', '');
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientDigits,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al enviar por WhatsApp Cloud API');
      }

      const msgId = data.messages?.[0]?.id || `wamid.${Date.now()}`;
      memoryLogs.push({
        id: msgId,
        timestamp: new Date().toISOString(),
        to: cleanPhone,
        studentName: nombreEstudiante,
        secretCode: codigoSecreto,
        messageText,
        status: 'SENT',
        provider: 'cloud_api',
      });

      return {
        success: true,
        provider: 'cloud_api',
        messageId: msgId,
        recipientPhone: cleanPhone,
        recipientName: nombreEstudiante,
        previewText: messageText,
      };
    } catch (err: any) {
      console.error('[WhatsApp Cloud API Error]:', err);
      return {
        success: false,
        provider: 'cloud_api',
        error: err.message || 'Error al conectar con WhatsApp Cloud API',
      };
    }
  }

  // 3. Fallback MOCK
  const mockMsgId = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  memoryLogs.push({
    id: mockMsgId,
    timestamp: new Date().toISOString(),
    to: cleanPhone,
    studentName: nombreEstudiante,
    secretCode: codigoSecreto,
    messageText,
    status: 'SIMULATED',
    provider: 'mock',
  });

  return {
    success: true,
    provider: 'mock',
    messageId: mockMsgId,
    recipientPhone: cleanPhone,
    recipientName: nombreEstudiante,
    previewText: messageText,
  };
}

/**
 * Genera un link directo de WhatsApp Web (wa.me) como respaldo de prueba
 */
export function generateDirectWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
