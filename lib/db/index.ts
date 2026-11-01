import { mysqlAdapter } from './mysql';
import { supabaseAdapter } from './supabase';
import { Estudiante, EntregaRegalo } from '../types';

export function getDbProvider(): 'mysql' | 'supabase' {
  const provider = (process.env.DB_PROVIDER || 'mysql').toLowerCase();
  return provider === 'supabase' ? 'supabase' : 'mysql';
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
