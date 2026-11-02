-- ==============================================================================
-- SEARCHFRIEND: Supabase (PostgreSQL) Schema & Initial Setup
-- ==============================================================================
-- Run this script in your Supabase Dashboard: SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Create 'estudiantes' table
CREATE TABLE IF NOT EXISTS public.estudiantes (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono_whatsapp VARCHAR(20) DEFAULT NULL,
  activo INT DEFAULT 1,
  desbloqueado_admin INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create 'entregas_regalos' table
CREATE TABLE IF NOT EXISTS public.entregas_regalos (
  id BIGSERIAL PRIMARY KEY,
  estudiante_id BIGINT NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  codigo_secreto VARCHAR(10) NOT NULL UNIQUE,
  mensaje_anonimo TEXT DEFAULT NULL,
  fecha_entrega TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_entregas_estudiante ON public.entregas_regalos(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_entregas_codigo ON public.entregas_regalos(codigo_secreto);
CREATE INDEX IF NOT EXISTS idx_entregas_fecha ON public.entregas_regalos(fecha_entrega);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_regalos ENABLE ROW LEVEL SECURITY;

-- 5. Policies: Allow public read and full service role / API access
CREATE POLICY "Allow public read active students" 
  ON public.estudiantes 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert and update on estudiantes" 
  ON public.estudiantes 
  FOR ALL 
  USING (true);

CREATE POLICY "Allow public read and insert entregas" 
  ON public.entregas_regalos 
  FOR ALL 
  USING (true);

-- 6. Initial Seed Data (add real phone numbers later via /admin)
INSERT INTO public.estudiantes (nombre, telefono_whatsapp) VALUES
('Student 1', NULL),
('Student 2', NULL),
('Student 3', NULL),
('Student 4', NULL),
('Student 5', NULL);
