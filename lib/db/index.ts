import { mysqlAdapter } from './mysql';
import { supabaseAdapter } from './supabase';
import { Estudiante, EntregaRegalo } from '../types';

export function getDbProvider(): 'mysql' | 'supabase' {
  if (process.env.DB_PROVIDER) {
    return process.env.DB_PROVIDER.toLowerCase() === 'supabase' ? 'supabase' : 'mysql';
  }
  // Auto-detectar Supabase si estamos en Vercel/Render o si existen variables de Supabase/Postgres
  if (
    process.env.VERCEL === '1' ||
    process.env.RENDER ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.POSTGRES_URL
  ) {
    return 'supabase';
  }
  return 'mysql';
}

function getAdapter() {
  const provider = getDbProvider();
  if (provider === 'supabase') {
    return supabaseAdapter;
  }
  return mysqlAdapter;
}

export const db = {
  async testConnection(): Promise<boolean> {
    return getAdapter().testConnection();
  },

  async getEstudiantes(onlyActive = true): Promise<Estudiante[]> {
    return getAdapter().getEstudiantes(onlyActive);
  },

  async getEstudianteById(id: number): Promise<Estudiante | null> {
    return getAdapter().getEstudianteById(id);
  },

  async createEstudiante(data: { nombre: string; telefono_whatsapp?: string | null; activo?: number }): Promise<Estudiante> {
    return getAdapter().createEstudiante(data);
  },

  async updateEstudiante(
    id: number,
    data: { nombre?: string; telefono_whatsapp?: string | null; activo?: number }
  ): Promise<Estudiante | null> {
    return getAdapter().updateEstudiante(id, data);
  },

  async deleteEstudiante(id: number): Promise<boolean> {
    return getAdapter().deleteEstudiante(id);
  },

  async unlockEstudiante(id: number, unlock = true): Promise<boolean> {
    return getAdapter().unlockEstudiante(id, unlock);
  },

  async unlockAllEstudiantes(): Promise<boolean> {
    return getAdapter().unlockAllEstudiantes();
  },

  async createEntrega(data: {
    estudiante_id: number;
    codigo_secreto: string;
    mensaje_anonimo?: string | null;
  }): Promise<EntregaRegalo> {
    return getAdapter().createEntrega(data);
  },

  async checkWeeklyLimit(estudiante_id: number) {
    return getAdapter().checkWeeklyLimit(estudiante_id);
  },

  async getEntregas(): Promise<EntregaRegalo[]> {
    return getAdapter().getEntregas();
  },

  async getEntregaByCodigo(codigo: string): Promise<EntregaRegalo | null> {
    return getAdapter().getEntregaByCodigo(codigo);
  },
};
