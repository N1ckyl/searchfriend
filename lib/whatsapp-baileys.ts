import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import { createClient } from '@supabase/supabase-js';

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

// Solo respaldar los archivos esenciales de identidad para no saturar memoria ni red con cientos de pre-keys
function isEssentialAuthFile(fileName: string): boolean {
  if (fileName === 'creds.json') return true;
  if (fileName.startsWith('device-list-')) return true;
  if (fileName.startsWith('identity-key-')) return true;
  if (fileName.startsWith('lid-mapping-')) return true;
  return false;
}

// Sincronización optimizada de la sesión con Supabase Storage
async function restoreAuthFromSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const supabase = createClient(url, key);
    const { data: files, error } = await supabase.storage.from('whatsapp_auth').list('', { limit: 100 });
    if (error || !files || files.length === 0) return false;

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const essentialFiles = files.filter((f) => isEssentialAuthFile(f.name));
    if (essentialFiles.length === 0) return false;

    await Promise.all(
      essentialFiles.map(async (f) => {
        try {
          const { data: blob, error: dlErr } = await supabase.storage.from('whatsapp_auth').download(f.name);
          if (!dlErr && blob) {
            const buffer = Buffer.from(await blob.arrayBuffer());
            fs.writeFileSync(path.join(AUTH_DIR, f.name), buffer);
          }
        } catch {}
      })
    );

    const hasCreds = fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
    console.log(`[WhatsApp Bot] Sesión restaurada con éxito desde Supabase Storage (creds: ${hasCreds}).`);
    return hasCreds;
  } catch (err) {
    console.warn('[WhatsApp Bot] Error restaurando sesión desde Supabase:', err);
    return false;
  }
}

let backupTimeout: NodeJS.Timeout | null = null;
function scheduleBackupToSupabase(): void {
  if (backupTimeout) clearTimeout(backupTimeout);
  backupTimeout = setTimeout(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || !fs.existsSync(AUTH_DIR)) return;

    try {
      const supabase = createClient(url, key);
      const files = fs.readdirSync(AUTH_DIR).filter(isEssentialAuthFile);
      await Promise.all(
        files.map(async (fileName) => {
          const filePath = path.join(AUTH_DIR, fileName);
          if (fs.statSync(filePath).isFile()) {
            const fileContent = fs.readFileSync(filePath);
            await supabase.storage.from('whatsapp_auth').upload(fileName, fileContent, { upsert: true });
          }
        })
      );
      console.log(`[WhatsApp Bot] ${files.length} archivos de sesión respaldados en Supabase Storage.`);
    } catch (err) {
      console.warn('[WhatsApp Bot] Error respaldando sesión en Supabase:', err);
    }
  }, 2000);
}

let keepAliveInterval: NodeJS.Timeout | null = null;
function startKeepAlive(): void {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  keepAliveInterval = setInterval(async () => {
    if (state.sock && state.status === 'CONNECTED') {
      try {
        await state.sock.sendPresenceUpdate('available');
      } catch (err) {
        console.warn('[WhatsApp Bot KeepAlive]:', err);
      }
    }
  }, 25000);
}

async function clearAuthFromSupabase(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const supabase = createClient(url, key);
    const { data: files } = await supabase.storage.from('whatsapp_auth').list('', { limit: 100 });
    if (files && files.length > 0) {
      const names = files.map((f) => f.name);
      await supabase.storage.from('whatsapp_auth').remove(names);
    }
  } catch {}
}

export function hasSavedCredentials(): boolean {
  try {
    return fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
  } catch {
    return false;
  }
}

export async function initBaileys(): Promise<void> {
  if (state.sock && state.status === 'CONNECTED') {
    return;
  }
  if (state.status === 'INITIALIZING') {
    return;
  }

  state.status = 'INITIALIZING';
  state.lastError = null;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    // Intentar restaurar sesión desde Supabase si la carpeta local no tiene creds.json
    if (!hasSavedCredentials()) {
      await restoreAuthFromSupabase();
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

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      scheduleBackupToSupabase();
    });

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
        if (keepAliveInterval) clearInterval(keepAliveInterval);

        if (shouldReconnect) {
          setTimeout(() => {
            initBaileys();
          }, 3000);
        } else {
          // Si cerró sesión voluntariamente, limpiar almacenamiento
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          clearAuthFromSupabase().catch(() => {});
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
        startKeepAlive();
        scheduleBackupToSupabase();
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
