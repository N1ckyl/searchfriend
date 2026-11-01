export interface Estudiante {
  id: number;
  nombre: string;
  telefono_whatsapp: string | null;
  activo: number | boolean;
  desbloqueado_admin?: number | boolean;
}

export interface EstudiantePublico {
  id: number;
  nombre: string;
  tiene_telefono: boolean;
  puede_recibir_hoy: boolean;
  desbloqueado_admin?: boolean;
  dias_restantes?: number;
  horas_restantes?: number;
  ultima_entrega?: string;
}

export interface EntregaRegalo {
  id: number;
  estudiante_id: number;
  codigo_secreto: string;
  mensaje_anonimo: string | null;
  fecha_entrega: string | Date;
  // Joins opcionales
  estudiante_nombre?: string;
  estudiante_telefono?: string | null;
}

export interface WeeklyLimitResult {
  allowed: boolean;
  lastDate?: Date;
  daysRemaining?: number;
  hoursRemaining?: number;
  unlockedByAdmin?: boolean;
}

export interface WhatsAppResult {
  success: boolean;
  provider: string;
  messageId?: string;
  recipientPhone?: string;
  recipientName?: string;
  previewText?: string;
  error?: string;
}

export interface SystemStatus {
  dbProvider: 'mysql' | 'supabase';
  dbConnected: boolean;
  whatsappProvider: string;
  whatsappBotNumber: string;
  baileysStatus?: 'DISCONNECTED' | 'INITIALIZING' | 'SCAN_QR' | 'CONNECTED';
  studentsCount: number;
  missingPhonesCount: number;
  deliveriesCount: number;
  error?: string;
}
