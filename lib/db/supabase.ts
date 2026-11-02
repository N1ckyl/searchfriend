import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Estudiante, EntregaRegalo } from '../types';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    // Normalize url if it includes /rest/v1
    supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

    const supabaseKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase no está configurado. Por favor define NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local'
      );
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

export const supabaseAdapter = {
  async testConnection(): Promise<boolean> {
    try {
      const client = getSupabaseClient();
      const { error } = await client.from('estudiantes').select('id').limit(1);
      return !error;
    } catch (error) {
      console.error('[Supabase Error] Connection failed:', error);
      return false;
    }
  },

  async getEstudiantes(onlyActive = true): Promise<Estudiante[]> {
    const client = getSupabaseClient();
    let query = client.from('estudiantes').select('id, nombre, telefono_whatsapp, activo, desbloqueado_admin').order('nombre', { ascending: true });
    if (onlyActive) {
      query = query.eq('activo', 1);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Estudiante[];
  },

  async getEstudianteById(id: number): Promise<Estudiante | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('estudiantes')
      .select('id, nombre, telefono_whatsapp, activo, desbloqueado_admin')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Estudiante;
  },

  async createEstudiante(data: { nombre: string; telefono_whatsapp?: string | null; activo?: number }): Promise<Estudiante> {
    const client = getSupabaseClient();
    const { data: created, error } = await client
      .from('estudiantes')
      .insert({
        nombre: data.nombre,
        telefono_whatsapp: data.telefono_whatsapp || null,
        activo: data.activo !== undefined ? data.activo : 1,
      })
      .select()
      .single();
    if (error) throw error;
    return created as Estudiante;
  },

  async updateEstudiante(
    id: number,
    data: { nombre?: string; telefono_whatsapp?: string | null; activo?: number }
  ): Promise<Estudiante | null> {
    const client = getSupabaseClient();
    const { data: updated, error } = await client
      .from('estudiantes')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated as Estudiante;
  },

  async deleteEstudiante(id: number): Promise<boolean> {
    const client = getSupabaseClient();
    const { error } = await client.from('estudiantes').delete().eq('id', id);
    return !error;
  },

  async unlockEstudiante(id: number, unlock = true): Promise<boolean> {
    const client = getSupabaseClient();
    const { error } = await client
      .from('estudiantes')
      .update({ desbloqueado_admin: unlock ? 1 : 0 })
      .eq('id', id);
    return !error;
  },

  async unlockAllEstudiantes(): Promise<boolean> {
    const client = getSupabaseClient();
    const { error } = await client
      .from('estudiantes')
      .update({ desbloqueado_admin: 1 })
      .neq('id', 0);
    return !error;
  },

  async createEntrega(data: {
    estudiante_id: number;
    codigo_secreto: string;
    mensaje_anonimo?: string | null;
  }): Promise<EntregaRegalo> {
    const client = getSupabaseClient();
    const { data: entrega, error } = await client
      .from('entregas_regalos')
      .insert({
        estudiante_id: data.estudiante_id,
        codigo_secreto: data.codigo_secreto,
        mensaje_anonimo: data.mensaje_anonimo || null,
      })
      .select(`
        id,
        estudiante_id,
        codigo_secreto,
        mensaje_anonimo,
        fecha_entrega,
        estudiantes (
          nombre,
          telefono_whatsapp
        )
      `)
      .single();

    if (error) throw error;

    // Consumir desbloqueo manual
    await client.from('estudiantes').update({ desbloqueado_admin: 0 }).eq('id', data.estudiante_id);

    const row = entrega as any;
    return {
      id: row.id,
      estudiante_id: row.estudiante_id,
      codigo_secreto: row.codigo_secreto,
      mensaje_anonimo: row.mensaje_anonimo,
      fecha_entrega: row.fecha_entrega,
      estudiante_nombre: row.estudiantes?.nombre,
      estudiante_telefono: row.estudiantes?.telefono_whatsapp,
    };
  },

  async checkWeeklyLimit(estudiante_id: number): Promise<{
    allowed: boolean;
    lastDate?: Date;
    daysRemaining?: number;
    hoursRemaining?: number;
    unlockedByAdmin?: boolean;
  }> {
    const client = getSupabaseClient();

    // 1. Revisar si admin desbloqueó manualmente
    const { data: stData } = await client
      .from('estudiantes')
      .select('desbloqueado_admin')
      .eq('id', estudiante_id)
      .single();

    if (stData && Number((stData as any).desbloqueado_admin) === 1) {
      return { allowed: true, unlockedByAdmin: true };
    }

    // 2. Comprobar inicio de semana (Lunes 00:00:00)
    const now = new Date();
    const day = now.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await client
      .from('entregas_regalos')
      .select('fecha_entrega')
      .eq('estudiante_id', estudiante_id)
      .gte('fecha_entrega', startOfWeek.toISOString())
      .order('fecha_entrega', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return { allowed: true };
    }

    const lastDate = new Date(data[0].fecha_entrega);
    const nextMonday = new Date(startOfWeek);
    nextMonday.setDate(nextMonday.getDate() + 7);

    const remainingMs = Math.max(0, nextMonday.getTime() - now.getTime());
    const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hoursRemaining = Math.ceil((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return {
      allowed: false,
      lastDate,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      hoursRemaining,
    };
  },

  async getEntregas(): Promise<EntregaRegalo[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('entregas_regalos')
      .select(`
        id,
        estudiante_id,
        codigo_secreto,
        mensaje_anonimo,
        fecha_entrega,
        estudiantes (
          nombre,
          telefono_whatsapp
        )
      `)
      .order('fecha_entrega', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      estudiante_id: row.estudiante_id,
      codigo_secreto: row.codigo_secreto,
      mensaje_anonimo: row.mensaje_anonimo,
      fecha_entrega: row.fecha_entrega,
      estudiante_nombre: row.estudiantes?.nombre,
      estudiante_telefono: row.estudiantes?.telefono_whatsapp,
    }));
  },

  async getEntregaByCodigo(codigo: string): Promise<EntregaRegalo | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('entregas_regalos')
      .select(`
        id,
        estudiante_id,
        codigo_secreto,
        mensaje_anonimo,
        fecha_entrega,
        estudiantes (
          nombre,
          telefono_whatsapp
        )
      `)
      .ilike('codigo_secreto', codigo.trim())
      .single();

    if (error || !data) return null;
    const row = data as any;
    return {
      id: row.id,
      estudiante_id: row.estudiante_id,
      codigo_secreto: row.codigo_secreto,
      mensaje_anonimo: row.mensaje_anonimo,
      fecha_entrega: row.fecha_entrega,
      estudiante_nombre: row.estudiantes?.nombre,
      estudiante_telefono: row.estudiantes?.telefono_whatsapp,
    };
  },
};
