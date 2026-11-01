import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Estudiante, EntregaRegalo, WeeklyLimitResult } from '../types';

let pool: Pool | null = null;

export function getMySqlPool(): Pool {
  if (!pool) {
    const host = process.env.MYSQL_HOST || 'localhost';
    const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD ?? '';
    const database = process.env.MYSQL_DATABASE || 'searchfriend';

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

/**
 * Obtiene la fecha del inicio de la semana actual (Lunes a las 00:00:00).
 */
export function getStartOfCurrentWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysSinceMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Obtiene la fecha del próximo lunes a las 00:00:00 (cuando se restablecen los envíos).
 */
export function getNextMonday(date = new Date()): Date {
  const start = getStartOfCurrentWeek(date);
  const next = new Date(start);
  next.setDate(next.getDate() + 7);
  return next;
}

export const mysqlAdapter = {
  async testConnection(): Promise<boolean> {
    try {
      const p = getMySqlPool();
      const [rows] = await p.query('SELECT 1 as val');
      return Array.isArray(rows) && rows.length > 0;
    } catch (error) {
      console.error('[MySQL Error] Connection failed:', error);
      return false;
    }
  },

  async getEstudiantes(onlyActive = true): Promise<Estudiante[]> {
    const p = getMySqlPool();
    const query = onlyActive
      ? 'SELECT id, nombre, telefono_whatsapp, activo, desbloqueado_admin FROM estudiantes WHERE activo = 1 ORDER BY nombre ASC'
      : 'SELECT id, nombre, telefono_whatsapp, activo, desbloqueado_admin FROM estudiantes ORDER BY nombre ASC';
    const [rows] = await p.query<RowDataPacket[]>(query);
    return rows as Estudiante[];
  },

  async getEstudianteById(id: number): Promise<Estudiante | null> {
    const p = getMySqlPool();
    const [rows] = await p.query<RowDataPacket[]>(
      'SELECT id, nombre, telefono_whatsapp, activo, desbloqueado_admin FROM estudiantes WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows || rows.length === 0) return null;
    return rows[0] as Estudiante;
  },

  async createEstudiante(data: { nombre: string; telefono_whatsapp?: string | null; activo?: number }): Promise<Estudiante> {
    const p = getMySqlPool();
    const [result] = await p.query<ResultSetHeader>(
      'INSERT INTO estudiantes (nombre, telefono_whatsapp, activo, desbloqueado_admin) VALUES (?, ?, ?, 0)',
      [data.nombre, data.telefono_whatsapp || null, data.activo !== undefined ? data.activo : 1]
    );
    return {
      id: result.insertId,
      nombre: data.nombre,
      telefono_whatsapp: data.telefono_whatsapp || null,
      activo: data.activo !== undefined ? data.activo : 1,
      desbloqueado_admin: 0,
    };
  },

  async updateEstudiante(
    id: number,
    data: { nombre?: string; telefono_whatsapp?: string | null; activo?: number; desbloqueado_admin?: number }
  ): Promise<Estudiante | null> {
    const p = getMySqlPool();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.nombre !== undefined) {
      fields.push('nombre = ?');
      values.push(data.nombre);
    }
    if (data.telefono_whatsapp !== undefined) {
      fields.push('telefono_whatsapp = ?');
      values.push(data.telefono_whatsapp);
    }
    if (data.activo !== undefined) {
      fields.push('activo = ?');
      values.push(data.activo);
    }
    if (data.desbloqueado_admin !== undefined) {
      fields.push('desbloqueado_admin = ?');
      values.push(data.desbloqueado_admin);
    }

    if (fields.length === 0) {
      return this.getEstudianteById(id);
    }

    values.push(id);
    await p.query(`UPDATE estudiantes SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getEstudianteById(id);
  },

  async unlockEstudiante(id: number, unlock = true): Promise<boolean> {
    const p = getMySqlPool();
    const [result] = await p.query<ResultSetHeader>(
      'UPDATE estudiantes SET desbloqueado_admin = ? WHERE id = ?',
      [unlock ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  async unlockAllEstudiantes(): Promise<boolean> {
    const p = getMySqlPool();
    const [result] = await p.query<ResultSetHeader>('UPDATE estudiantes SET desbloqueado_admin = 1');
    return result.affectedRows > 0;
  },

  async deleteEstudiante(id: number): Promise<boolean> {
    const p = getMySqlPool();
    const [result] = await p.query<ResultSetHeader>('DELETE FROM estudiantes WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async checkWeeklyLimit(estudiante_id: number): Promise<WeeklyLimitResult> {
    const p = getMySqlPool();

    // 1. Verificar si el administrador lo desbloqueó manualmente
    const [studentRows] = await p.query<RowDataPacket[]>(
      'SELECT desbloqueado_admin FROM estudiantes WHERE id = ? LIMIT 1',
      [estudiante_id]
    );
    if (studentRows && studentRows.length > 0 && Number(studentRows[0].desbloqueado_admin) === 1) {
      return { allowed: true, unlockedByAdmin: true };
    }

    // 2. Comprobar si ya recibió una entrega DESDE EL LUNES DE ESTA SEMANA
    const startOfWeek = getStartOfCurrentWeek();
    const [rows] = await p.query<RowDataPacket[]>(
      `SELECT fecha_entrega FROM entregas_regalos 
       WHERE estudiante_id = ? AND fecha_entrega >= ?
       ORDER BY fecha_entrega DESC LIMIT 1`,
      [estudiante_id, startOfWeek]
    );

    if (!rows || rows.length === 0) {
      return { allowed: true };
    }

    const lastDate = new Date(rows[0].fecha_entrega);
    const now = new Date();
    const nextMonday = getNextMonday(now);
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

  async createEntrega(data: {
    estudiante_id: number;
    codigo_secreto: string;
    mensaje_anonimo?: string | null;
  }): Promise<EntregaRegalo> {
    const p = getMySqlPool();
    const [result] = await p.query<ResultSetHeader>(
      'INSERT INTO entregas_regalos (estudiante_id, codigo_secreto, mensaje_anonimo) VALUES (?, ?, ?)',
      [data.estudiante_id, data.codigo_secreto, data.mensaje_anonimo || null]
    );

    // Al registrar entrega, consumir el desbloqueo manual si existía
    await p.query('UPDATE estudiantes SET desbloqueado_admin = 0 WHERE id = ?', [data.estudiante_id]);

    const [rows] = await p.query<RowDataPacket[]>(
      `SELECT er.id, er.estudiante_id, er.codigo_secreto, er.mensaje_anonimo, er.fecha_entrega,
              e.nombre as estudiante_nombre, e.telefono_whatsapp as estudiante_telefono
       FROM entregas_regalos er
       JOIN estudiantes e ON er.estudiante_id = e.id
       WHERE er.id = ? LIMIT 1`,
      [result.insertId]
    );

    return rows[0] as EntregaRegalo;
  },

  async getEntregas(): Promise<EntregaRegalo[]> {
    const p = getMySqlPool();
    const [rows] = await p.query<RowDataPacket[]>(
      `SELECT er.id, er.estudiante_id, er.codigo_secreto, er.mensaje_anonimo, er.fecha_entrega,
              e.nombre as estudiante_nombre, e.telefono_whatsapp as estudiante_telefono
       FROM entregas_regalos er
       JOIN estudiantes e ON er.estudiante_id = e.id
       ORDER BY er.fecha_entrega DESC`
    );
    return rows as EntregaRegalo[];
  },

  async getEntregaByCodigo(codigo: string): Promise<EntregaRegalo | null> {
    const p = getMySqlPool();
    const [rows] = await p.query<RowDataPacket[]>(
      `SELECT er.id, er.estudiante_id, er.codigo_secreto, er.mensaje_anonimo, er.fecha_entrega,
              e.nombre as estudiante_nombre, e.telefono_whatsapp as estudiante_telefono
       FROM entregas_regalos er
       JOIN estudiantes e ON er.estudiante_id = e.id
       WHERE LOWER(er.codigo_secreto) = LOWER(?) LIMIT 1`,
      [codigo.trim()]
    );
    if (!rows || rows.length === 0) return null;
    return rows[0] as EntregaRegalo;
  },
};
