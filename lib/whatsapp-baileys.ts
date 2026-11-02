import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

export type BaileysStatus = 'DISCONNECTED' | 'INITIALIZING' | 'SCAN_QR' | 'CONNECTED';

interface BaileysState {
  sock: WASocket | null;
  status: BaileysStatus;
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  lastError: string | null;
}

// Singleton en globalThis para que persista entre hot-reloads en Node.js
const globalForBaileys = globalThis as unknown as {
  baileysState?: BaileysState;
};

const state: BaileysState = globalForBaileys.baileysState || {
  sock: null,
  status: 'DISCONNECTED',
  qrCodeDataUrl: null,
  connectedPhone: null,
  lastError: null,
};

globalForBaileys.baileysState = state;

const AUTH_DIR = path.join(process.cwd(), 'whatsapp_auth');

export async function initBaileys(): Promise<void> {
  if (state.sock && (state.status === 'CONNECTED' || state.status === 'SCAN_QR')) {
    return;
  }

  state.status = 'INITIALIZING';
  state.lastError = null;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
      auth: authState,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['SearchFriend', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      defaultQueryTimeoutMs: 60000,
    });

    state.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          state.qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
          state.status = 'SCAN_QR';
          console.log('\n[WhatsApp Bot] ¡Nuevo código QR generado! Escanéalo en /admin\n');
        } catch (err: any) {
          console.error('[WhatsApp Bot] Error generando QR imagen:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp Bot] Conexión cerrada. Código: ${statusCode}. ¿Reconectar?: ${shouldReconnect}`);

        state.status = 'DISCONNECTED';
        state.qrCodeDataUrl = null;
        state.connectedPhone = null;
        state.sock = null;

        if (shouldReconnect) {
          setTimeout(() => {
            initBaileys();
          }, 3000);
        } else {
          // Si cerró sesión, borrar carpeta de credenciales para permitir nuevo escaneo
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
        }
      } else if (connection === 'open') {
        state.status = 'CONNECTED';
        state.qrCodeDataUrl = null;
        const userJid = sock.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0];
        state.connectedPhone = `+${phone}`;
        console.log(`\n======================================================`);
        console.log(`🟢 [WhatsApp Bot] Conectado exitosamente como: ${state.connectedPhone}`);
        console.log(`======================================================\n`);
      }
    });
  } catch (error: any) {
    state.status = 'DISCONNECTED';
    state.lastError = error.message || 'Error al iniciar Baileys';
    console.error('[WhatsApp Bot Error al iniciar]:', error);
  }
}

export function getBaileysStatus(): {
  status: BaileysStatus;
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  lastError: string | null;
} {
  return {
    status: state.status,
    qrCodeDataUrl: state.qrCodeDataUrl,
    connectedPhone: state.connectedPhone,
    lastError: state.lastError,
  };
}

export async function sendBaileysMessage(
  phone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (state.status !== 'CONNECTED' || !state.sock) {
    return {
      success: false,
      error: 'El Bot de WhatsApp no está conectado. Ve a /admin para escanear el código QR.',
    };
  }

  try {
    // Normalizar número telefónico
    let cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length === 9) {
      cleanPhone = '51' + cleanPhone; // Perú por defecto si son 9 dígitos
    }

    // Resolver JID exacto en WhatsApp
    let targetJid = `${cleanPhone}@s.whatsapp.net`;
    try {
      const waResults = await state.sock.onWhatsApp(cleanPhone);
      if (waResults && waResults.length > 0 && waResults[0]?.exists) {
        targetJid = waResults[0].jid;
      }
    } catch (checkErr) {
      console.warn('[WhatsApp Bot] onWhatsApp advertencia:', checkErr);
    }

    const sent = await state.sock.sendMessage(targetJid, { text });

    return {
      success: true,
      messageId: sent?.key?.id || `baileys_${Date.now()}`,
    };
  } catch (error: any) {
    console.error('[WhatsApp Bot Error al enviar mensaje]:', error);
    return {
      success: false,
      error: error.message || 'Error al despachar mensaje de WhatsApp',
    };
  }
}

export async function disconnectBaileys(): Promise<void> {
  try {
    if (state.sock) {
      await state.sock.logout();
      state.sock = null;
    }
  } catch {}

  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch {}

  state.status = 'DISCONNECTED';
  state.qrCodeDataUrl = null;
  state.connectedPhone = null;
}
